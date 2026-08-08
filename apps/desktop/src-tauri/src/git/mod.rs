//! Git transport plumbing — no system Git installation needed.
//!
//! Phase 3 will add repository management (init/clone/commit/push) via
//! libgit2. This module currently owns the SSH connection probe and the
//! strict host-key verification shared with future push operations.
//!
//! The probe drives libssh2 directly (via the `ssh2` crate) instead of
//! going through libgit2's SSH transport: libgit2 forces the host-key
//! algorithm found in the user's `known_hosts` (commonly ssh-ed25519,
//! which the Windows WinCNG crypto backend cannot verify), while here we
//! negotiate GitHub's RSA host key, which every backend supports.

use std::collections::HashSet;
use std::io;
use std::net::{TcpStream, ToSocketAddrs};
use std::path::{Path, PathBuf};
use std::time::{Duration, UNIX_EPOCH};

use base64::engine::general_purpose::STANDARD_NO_PAD as BASE64_NO_PAD;
use base64::Engine;
use git2::cert::Cert;
use git2::{
    CertificateCheckStatus, Cred, IndexEntry, IndexTime, PushOptions, RemoteCallbacks, Repository,
    RepositoryInitOptions, Signature,
};

use crate::errors::{AppError, AppResult};

/// GitHub's published SSH host key fingerprints (SHA256, base64 without
/// padding) — see https://docs.github.com/en/authentication/keychecking.
/// Pinning these instead of trusting-on-first-use protects the backup
/// traffic from man-in-the-middle interception.
const GITHUB_HOST_KEY_FINGERPRINTS: &[&str] = &[
    "+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU", // ed25519
    "p2QAMXNIC1TJYWeIOttrVc98/R1BUFWu3/LiyKgUfQM", // ECDSA
    "uNiVztksCsDhcc0u9e8BujQXVUpKZIDTMczCvj3tD2s", // RSA
];

const GITHUB_SSH_ADDR: &str = "github.com:22";
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const SESSION_TIMEOUT_MS: u32 = 20_000;

/// Host-key algorithms the WinCNG libssh2 backend verifies reliably.
const HOST_KEY_PREFERENCE: &str = "rsa-sha2-512,rsa-sha2-256,ssh-rsa";

// libssh2 error codes surfaced through ssh2::Error::code().
const LIBSSH2_ERROR_AUTHENTICATION_FAILED: i32 = -18;
const LIBSSH2_ERROR_PUBLICKEY_UNVERIFIED: i32 = -19;

pub struct SshProbeOutcome {
    pub success: bool,
    pub message: String,
}

enum ProbeFailure {
    Network(String),
    HostKeyMismatch(String),
    AuthRejected,
    Ssh(ssh2::Error),
}

/// Verify that `private_key_path` authenticates against github.com over
/// SSH. Expected failures (rejected key, no network) are reported in the
/// outcome rather than as errors.
pub fn probe_github_ssh(private_key_path: &Path) -> SshProbeOutcome {
    match try_probe(private_key_path) {
        Ok(()) => SshProbeOutcome {
            success: true,
            message: "Authenticated with GitHub over SSH.".into(),
        },
        Err(failure) => {
            let message = match failure {
                ProbeFailure::Network(detail) => {
                    log::warn!("SSH probe network failure: {detail}");
                    "Could not reach github.com. Check your internet connection.".into()
                }
                ProbeFailure::HostKeyMismatch(fingerprint) => {
                    log::error!("SSH host key mismatch for github.com: SHA256:{fingerprint}");
                    "The server's SSH host key did not match GitHub's published keys. \
                     Check your network for interception and try again."
                        .into()
                }
                ProbeFailure::AuthRejected => {
                    "GitHub did not accept the key. Add the public key to your GitHub \
                     account (Settings → SSH and GPG keys), then test again."
                        .into()
                }
                ProbeFailure::Ssh(error) => {
                    log::error!("SSH probe failed: {error:?}");
                    "The SSH connection to GitHub failed. See the application log for \
                     details."
                        .into()
                }
            };
            SshProbeOutcome {
                success: false,
                message,
            }
        }
    }
}

fn try_probe(private_key_path: &Path) -> Result<(), ProbeFailure> {
    let address = GITHUB_SSH_ADDR
        .to_socket_addrs()
        .map_err(|e| ProbeFailure::Network(e.to_string()))?
        .next()
        .ok_or_else(|| ProbeFailure::Network("github.com did not resolve".into()))?;
    let tcp = TcpStream::connect_timeout(&address, CONNECT_TIMEOUT)
        .map_err(|e| ProbeFailure::Network(e.to_string()))?;

    let mut session = ssh2::Session::new().map_err(ProbeFailure::Ssh)?;
    session.set_timeout(SESSION_TIMEOUT_MS);
    session
        .method_pref(ssh2::MethodType::HostKey, HOST_KEY_PREFERENCE)
        .map_err(ProbeFailure::Ssh)?;
    session.set_tcp_stream(tcp);
    session.handshake().map_err(ProbeFailure::Ssh)?;

    let hash = session
        .host_key_hash(ssh2::HashType::Sha256)
        .ok_or_else(|| ProbeFailure::HostKeyMismatch("<no hash available>".into()))?;
    let fingerprint = BASE64_NO_PAD.encode(hash);
    if !GITHUB_HOST_KEY_FINGERPRINTS.contains(&fingerprint.as_str()) {
        return Err(ProbeFailure::HostKeyMismatch(fingerprint));
    }

    match session.userauth_pubkey_file("git", None, private_key_path, None) {
        Ok(()) => {}
        Err(error) => {
            return Err(match error.code() {
                ssh2::ErrorCode::Session(
                    LIBSSH2_ERROR_AUTHENTICATION_FAILED | LIBSSH2_ERROR_PUBLICKEY_UNVERIFIED,
                ) => ProbeFailure::AuthRejected,
                _ => ProbeFailure::Ssh(error),
            })
        }
    }
    if !session.authenticated() {
        return Err(ProbeFailure::AuthRejected);
    }
    Ok(())
}

/// Open the managed workspace repository, initializing it (with the given
/// initial branch) on first use.
pub fn open_or_init(path: &Path, initial_branch: &str) -> AppResult<Repository> {
    if path.join(".git").is_dir() {
        return Ok(Repository::open(path)?);
    }
    std::fs::create_dir_all(path)?;
    let mut options = RepositoryInitOptions::new();
    options.initial_head(initial_branch);
    Ok(Repository::init_opts(path, &options)?)
}

/// Stage every change in the working tree and commit. Returns `None` when
/// the tree is identical to HEAD (no empty commits).
pub fn commit_all(repository: &Repository, message: &str) -> AppResult<Option<String>> {
    let mut index = repository.index()?;
    stage_worktree(repository, &mut index)?;
    index.write()?;
    let tree_id = index.write_tree()?;

    let head_commit = match repository.head() {
        Ok(head) => Some(head.peel_to_commit()?),
        Err(_) => None,
    };
    if let Some(commit) = &head_commit {
        if commit.tree_id() == tree_id {
            return Ok(None);
        }
    }

    let signature = Signature::now("NextHive", "backup@nexthive.app")?;
    let tree = repository.find_tree(tree_id)?;
    let parents: Vec<&git2::Commit> = head_commit.iter().collect();
    let oid = repository.commit(
        Some("HEAD"),
        &signature,
        &signature,
        message,
        &tree,
        &parents,
    )?;
    Ok(Some(oid.to_string()))
}

/// Stage the managed worktree without asking libgit2 to open each file by
/// its absolute Windows path. libgit2's default `add_all` path can hit the
/// legacy MAX_PATH boundary even when Rust and WebView2 are long-path aware.
/// Streaming blobs through the object database keeps memory bounded and the
/// index stores only repository-relative paths.
fn stage_worktree(repository: &Repository, index: &mut git2::Index) -> AppResult<()> {
    let workdir = repository
        .workdir()
        .ok_or_else(|| AppError::internal("managed backup repository has no worktree"))?;
    let previous_paths: Vec<Vec<u8>> = index.iter().map(|entry| entry.path).collect();
    let mut current_paths: HashSet<Vec<u8>> = HashSet::new();

    let walker = walkdir::WalkDir::new(workdir)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| entry.file_name() != ".git");

    for entry in walker {
        let entry = entry.map_err(|error| {
            AppError::internal(format!("could not walk managed Git worktree: {error}"))
        })?;
        if !entry.file_type().is_file() {
            continue;
        }
        let relative = entry
            .path()
            .strip_prefix(workdir)
            .map_err(|_| AppError::internal("Git worktree entry escaped its root"))?;
        let relative_path = relative
            .components()
            .map(|component| component.as_os_str().to_string_lossy())
            .collect::<Vec<_>>()
            .join("/");
        let path_bytes = relative_path.as_bytes().to_vec();
        current_paths.insert(path_bytes.clone());

        let metadata = entry.metadata().map_err(|error| {
            AppError::internal(format!("could not inspect managed Git file: {error}"))
        })?;
        let modified = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .unwrap_or_default();
        let seconds = modified.as_secs().min(i32::MAX as u64) as i32;
        let nanoseconds = modified.subsec_nanos();
        let file_size = metadata.len().min(u32::MAX as u64) as u32;

        if index
            .get_path(Path::new(&relative_path), 0)
            .is_some_and(|existing| {
                existing.file_size == file_size
                    && existing.mtime.seconds() == seconds
                    && existing.mtime.nanoseconds() == nanoseconds
            })
        {
            continue;
        }

        let mut source = std::fs::File::open(entry.path())?;
        let mut writer = repository.blob_writer(None)?;
        io::copy(&mut source, &mut writer)?;
        let oid = writer.commit()?;
        index.add(&IndexEntry {
            ctime: IndexTime::new(seconds, nanoseconds),
            mtime: IndexTime::new(seconds, nanoseconds),
            dev: 0,
            ino: 0,
            mode: file_mode(&metadata),
            uid: 0,
            gid: 0,
            file_size,
            id: oid,
            flags: 0,
            flags_extended: 0,
            path: path_bytes,
        })?;
    }

    for old_path in previous_paths {
        if !current_paths.contains(&old_path) {
            let path = PathBuf::from(String::from_utf8_lossy(&old_path).into_owned());
            index.remove_path(&path)?;
        }
    }
    Ok(())
}

#[cfg(unix)]
fn file_mode(metadata: &std::fs::Metadata) -> u32 {
    use std::os::unix::fs::PermissionsExt;
    if metadata.permissions().mode() & 0o111 != 0 {
        0o100755
    } else {
        0o100644
    }
}

#[cfg(not(unix))]
fn file_mode(_metadata: &std::fs::Metadata) -> u32 {
    0o100644
}

/// Push the workspace's HEAD branch to `remote_url`, authenticating with a
/// provider access token over HTTPS.
pub fn push_https_with_token(
    repository: &Repository,
    remote_url: &str,
    remote_branch: &str,
    username: &str,
    token: &str,
) -> AppResult<()> {
    let head = repository.head()?;
    let local_branch = head
        .shorthand()
        .ok_or_else(|| AppError::internal("workspace HEAD has no branch name"))?
        .to_owned();

    let token = token.to_owned();
    let username = username.to_owned();
    let mut callbacks = RemoteCallbacks::new();
    callbacks
        .credentials(move |_url, _username, _allowed| Cred::userpass_plaintext(&username, &token));
    callbacks.certificate_check(|cert, hostname| {
        if cert.as_hostkey().is_some() {
            verify_github_host_key(cert, hostname)
        } else {
            // HTTPS: let the OS TLS stack perform its normal validation.
            Ok(CertificateCheckStatus::CertificatePassthrough)
        }
    });

    let mut options = PushOptions::new();
    options.remote_callbacks(callbacks);
    let mut remote = repository.remote_anonymous(remote_url)?;
    remote.push(
        &[format!(
            "refs/heads/{local_branch}:refs/heads/{remote_branch}"
        )],
        Some(&mut options),
    )?;
    Ok(())
}

/// Certificate check for libgit2 remotes: accepts only GitHub's published
/// SSH host keys; HTTPS certificates use default validation.
pub fn verify_github_host_key(
    cert: &Cert<'_>,
    hostname: &str,
) -> Result<CertificateCheckStatus, git2::Error> {
    let Some(hostkey) = cert.as_hostkey() else {
        return Err(git2::Error::from_str(
            "no SSH host key presented during handshake",
        ));
    };

    let hash: [u8; 32] = if let Some(hash) = hostkey.hash_sha256() {
        *hash
    } else if let Some(raw) = hostkey.hostkey() {
        use sha2::{Digest, Sha256};
        Sha256::digest(raw).into()
    } else {
        return Err(git2::Error::from_str("SSH host key could not be read"));
    };

    let fingerprint = BASE64_NO_PAD.encode(hash);
    if GITHUB_HOST_KEY_FINGERPRINTS.contains(&fingerprint.as_str()) {
        Ok(CertificateCheckStatus::CertificateOk)
    } else {
        log::error!("host key mismatch for {hostname}: SHA256:{fingerprint}");
        Err(git2::Error::from_str(
            "SSH host key verification for github.com failed",
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn commit_streams_files_beyond_legacy_windows_path_limit() {
        let root =
            std::env::temp_dir().join(format!("nexthive-long-git-path-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let relative = PathBuf::from("2026-08-08")
            .join("source")
            .join("a".repeat(55))
            .join("b".repeat(55))
            .join("c".repeat(55))
            .join("d".repeat(55))
            .join("backup-file.txt");
        let file = root.join(&relative);
        assert!(file.to_string_lossy().len() > 260);
        std::fs::create_dir_all(file.parent().unwrap()).unwrap();
        std::fs::write(&file, b"protected").unwrap();

        {
            let repository = open_or_init(&root, "main").unwrap();
            let commit = commit_all(&repository, "long path test").unwrap();
            assert!(commit.is_some());
            let tree = repository
                .head()
                .unwrap()
                .peel_to_commit()
                .unwrap()
                .tree()
                .unwrap();
            let repo_path = relative
                .components()
                .map(|component| component.as_os_str().to_string_lossy())
                .collect::<Vec<_>>()
                .join("/");
            assert!(tree.get_path(Path::new(&repo_path)).is_ok());
        }
        let _ = std::fs::remove_dir_all(&root);
    }
}
