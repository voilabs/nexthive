//! Managed backup workspace — the local Git working tree.
//!
//! Layout: one snapshot folder per backup date. Profiles with continuous
//! backup enabled separate quick change snapshots from intentional backups:
//!
//! `<profile>/<YYYY-MM-DD>-hot/...`
//! `<profile>/<YYYY-MM-DD>/...`
//!
//! Old snapshot folders stay in the tree. To keep local disk usage flat,
//! files unchanged since the previous snapshot are HARD-LINKED from it
//! rather than copied — Git reads identical content (deduplicated as one
//! blob), while the filesystem stores it once. Because links share an
//! inode, targets are always removed before writing new content.
//!
//! User source folders are never touched; files are copied here.

use std::collections::HashSet;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};

use crate::errors::{AppError, AppResult};

pub const HOT_BACKUP_SUFFIX: &str = "-hot";

pub fn workspace_dir(data_dir: &Path, profile_id: i64) -> PathBuf {
    data_dir.join("repositories").join(profile_id.to_string())
}

/// Resolve an internal relative snapshot path without allowing a corrupted
/// database value to escape the managed repository.
pub fn resolve_snapshot_path(workspace: &Path, relative: &str) -> AppResult<PathBuf> {
    let relative = Path::new(relative);
    if relative.as_os_str().is_empty()
        || relative
            .components()
            .any(|component| !matches!(component, std::path::Component::Normal(_)))
    {
        return Err(AppError::internal(
            "confirmed snapshot path is not a safe relative path",
        ));
    }
    Ok(workspace.join(relative))
}

fn is_date_name(name: &str) -> bool {
    name.len() == 10
        && name.bytes().enumerate().all(|(i, b)| match i {
            4 | 7 => b == b'-',
            _ => b.is_ascii_digit(),
        })
}

fn snapshot_date(name: &str) -> Option<&str> {
    if is_date_name(name) {
        Some(name)
    } else {
        name.strip_suffix(HOT_BACKUP_SUFFIX)
            .filter(|date| is_date_name(date))
    }
}

fn is_snapshot_dir_name(name: &str) -> bool {
    snapshot_date(name).is_some()
}

/// The most recent snapshot folder strictly older than `current`, if any.
pub fn find_previous_snapshot(workspace: &Path, current: &str) -> AppResult<Option<PathBuf>> {
    let mut best: Option<String> = None;
    let current_date = snapshot_date(current).unwrap_or(current);
    if !workspace.is_dir() {
        return Ok(None);
    }
    for entry in std::fs::read_dir(workspace)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if entry.file_type()?.is_dir()
            && is_snapshot_dir_name(&name)
            && snapshot_date(&name).is_some_and(|date| date < current_date)
            && best.as_deref().is_none_or(|best| {
                snapshot_date(&name)
                    .zip(snapshot_date(best))
                    .is_some_and(|(candidate, current_best)| candidate > current_best)
            })
        {
            best = Some(name);
        }
    }
    Ok(best.map(|name| workspace.join(name)))
}

fn target_path(snapshot_dir: &Path, relative_path: &str) -> PathBuf {
    snapshot_dir.join(relative_path.replace('/', std::path::MAIN_SEPARATOR_STR))
}

/// Copy a source file into the snapshot folder. The target is removed
/// first: it may be a hard link shared with an older snapshot, and writing
/// through it would corrupt that history.
pub fn copy_into(snapshot_dir: &Path, relative_path: &str, source_file: &Path) -> AppResult<()> {
    let target = target_path(snapshot_dir, relative_path);
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)?;
    }
    if target.exists() {
        std::fs::remove_file(&target)?;
    }
    std::fs::copy(source_file, &target)?;
    Ok(())
}

/// Write the canonical Git LFS pointer at the file's normal repository
/// path. The actual bytes live in `.git/lfs/objects` and on GitHub LFS.
pub fn write_lfs_pointer(
    snapshot_dir: &Path,
    relative_path: &str,
    oid: &str,
    size: i64,
) -> AppResult<()> {
    let target = target_path(snapshot_dir, relative_path);
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)?;
    }
    if target.exists() {
        std::fs::remove_file(&target)?;
    }
    std::fs::write(
        target,
        format!("version https://git-lfs.github.com/spec/v1\noid sha256:{oid}\nsize {size}\n"),
    )?;
    Ok(())
}

/// Cache a verified immutable LFS object beneath the managed repository.
/// Files are copied instead of hard-linked so later user edits cannot alter
/// an object that has already been identified by its SHA-256.
pub fn store_lfs_object(
    git_dir: &Path,
    oid: &str,
    size: i64,
    source_file: &Path,
) -> AppResult<PathBuf> {
    if oid.len() != 64 || !oid.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err(AppError::internal("invalid SHA-256 used for an LFS object"));
    }
    let target = git_dir
        .join("lfs")
        .join("objects")
        .join(&oid[0..2])
        .join(&oid[2..4])
        .join(oid);
    if target.is_file() && target.metadata()?.len() == size as u64 {
        return Ok(target);
    }
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let temporary = target.with_extension(format!("nexthive-{}-tmp", std::process::id()));
    let result = (|| -> AppResult<()> {
        let mut source = std::fs::File::open(source_file)?;
        let mut output = std::fs::File::create(&temporary)?;
        let mut hasher = Sha256::new();
        let mut copied = 0u64;
        let mut buffer = vec![0u8; 1024 * 1024];
        loop {
            let read = source.read(&mut buffer)?;
            if read == 0 {
                break;
            }
            output.write_all(&buffer[..read])?;
            hasher.update(&buffer[..read]);
            copied += read as u64;
        }
        output.sync_all()?;
        let copied_oid = format!("{:x}", hasher.finalize());
        if copied != size as u64 || copied_oid != oid {
            return Err(AppError::Validation(
                "The file changed while NextHive was preparing it. Try the backup again.".into(),
            ));
        }
        std::fs::rename(&temporary, &target)?;
        Ok(())
    })();
    if result.is_err() {
        let _ = std::fs::remove_file(&temporary);
    }
    result?;
    Ok(target)
}

/// Bring an unchanged file into the snapshot folder: hard-link it from the
/// previous snapshot when possible, otherwise copy from the original
/// source file.
pub fn link_or_copy_unchanged(
    snapshot_dir: &Path,
    previous_snapshot: Option<&Path>,
    relative_path: &str,
    source_file: &Path,
) -> AppResult<()> {
    let target = target_path(snapshot_dir, relative_path);
    if target.exists() {
        return Ok(()); // already present (same-day rerun)
    }
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)?;
    }
    if let Some(previous) = previous_snapshot {
        let link_source = target_path(previous, relative_path);
        if link_source.is_file() && std::fs::hard_link(&link_source, &target).is_ok() {
            return Ok(());
        }
    }
    std::fs::copy(source_file, &target)?;
    Ok(())
}

/// Remove top-level workspace entries that are neither snapshot folders
/// nor `.git` (e.g. the pre-date-layout `sources/` root); Git records
/// their files as deletions.
pub fn prune_workspace_roots(workspace: &Path) -> AppResult<()> {
    if !workspace.is_dir() {
        return Ok(());
    }
    for entry in std::fs::read_dir(workspace)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if entry.file_type()?.is_dir() && name != ".git" && !is_snapshot_dir_name(&name) {
            log::info!("pruning legacy workspace root {name}");
            std::fs::remove_dir_all(entry.path())?;
        }
    }
    Ok(())
}

fn snapshot_files(snapshot_dir: &Path) -> AppResult<Vec<(PathBuf, String)>> {
    if !snapshot_dir.is_dir() {
        return Ok(Vec::new());
    }

    let mut files = Vec::new();
    for entry in walkdir::WalkDir::new(snapshot_dir).follow_links(false) {
        let entry = entry.map_err(|error| {
            AppError::internal(format!(
                "could not inspect the dated backup snapshot: {error}"
            ))
        })?;
        if !entry.file_type().is_file() {
            continue;
        }
        let relative = entry
            .path()
            .strip_prefix(snapshot_dir)
            .map_err(|_| AppError::internal("snapshot entry escaped its managed root"))?
            .components()
            .map(|component| component.as_os_str().to_string_lossy())
            .collect::<Vec<_>>()
            .join("/");
        files.push((entry.path().to_path_buf(), relative));
    }
    Ok(files)
}

/// Check whether an existing dated snapshot already uses the current flat
/// layout and contains exactly the files produced by all selected sources.
pub fn snapshot_matches(snapshot_dir: &Path, expected: &HashSet<String>) -> AppResult<bool> {
    if !snapshot_dir.is_dir() {
        return Ok(false);
    }
    let actual = snapshot_files(snapshot_dir)?
        .into_iter()
        .map(|(_, relative)| relative)
        .collect::<HashSet<_>>();
    Ok(actual == *expected)
}

/// Remove files no longer present in the flattened source view, including
/// obsolete source-alias roots left by older NextHive versions. Empty
/// directories are pruned afterwards.
pub fn prune_snapshot_files(snapshot_dir: &Path, expected: &HashSet<String>) -> AppResult<()> {
    if !snapshot_dir.is_dir() {
        return Ok(());
    }

    let mut removed_files = 0usize;
    for (path, relative) in snapshot_files(snapshot_dir)? {
        if !expected.contains(&relative) {
            std::fs::remove_file(path)?;
            removed_files += 1;
        }
    }
    if removed_files > 0 {
        log::info!("pruned {removed_files} stale files from the dated snapshot");
    }

    let mut directories = walkdir::WalkDir::new(snapshot_dir)
        .min_depth(1)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_dir())
        .map(|entry| entry.path().to_path_buf())
        .collect::<Vec<_>>();
    directories.sort_by_key(|path| std::cmp::Reverse(path.components().count()));
    for directory in directories {
        match std::fs::remove_dir(&directory) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::DirectoryNotEmpty => {}
            Err(error) => return Err(error.into()),
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snapshot_dir_names_are_dates() {
        assert!(is_snapshot_dir_name("2026-08-08"));
        assert!(is_snapshot_dir_name("2026-08-08-hot"));
        assert!(!is_snapshot_dir_name("sources"));
        assert!(!is_snapshot_dir_name("2026-8-8"));
        assert!(!is_snapshot_dir_name("2026-08-08-warm"));
        assert!(!is_snapshot_dir_name(".git"));
    }

    #[test]
    fn confirmed_snapshot_paths_cannot_escape_the_workspace() {
        let workspace = Path::new("repository");
        assert_eq!(
            resolve_snapshot_path(workspace, "2026-08-08-hot").unwrap(),
            workspace.join("2026-08-08-hot")
        );
        assert!(resolve_snapshot_path(workspace, "../outside").is_err());
        assert!(resolve_snapshot_path(workspace, "/outside").is_err());
    }

    #[test]
    fn flat_snapshot_layout_is_compared_by_relative_path() {
        let unique = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!(
            "nexthive-snapshot-layout-{}-{unique}",
            std::process::id(),
        ));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(root.join("nested")).unwrap();
        std::fs::write(root.join("nested/file.txt"), b"content").unwrap();

        let expected = HashSet::from(["nested/file.txt".to_string()]);
        assert!(snapshot_matches(&root, &expected).unwrap());

        std::fs::create_dir_all(root.join("OldAlias")).unwrap();
        std::fs::write(root.join("OldAlias/file.txt"), b"old").unwrap();
        assert!(!snapshot_matches(&root, &expected).unwrap());
        prune_snapshot_files(&root, &expected).unwrap();
        assert!(snapshot_matches(&root, &expected).unwrap());
        assert!(!root.join("OldAlias").exists());

        std::fs::remove_dir_all(root).unwrap();
    }
}
