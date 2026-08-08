//! Backup pipeline orchestration.
//!
//! Pipeline: acquire the profile lock → validate configuration → scan →
//! diff against confirmed snapshots → sync the managed workspace → commit
//! → push → only then advance the snapshot state → record the run.
//! Progress is streamed to the frontend as events; failures never mark a
//! run successful.

pub mod workspace;

use std::collections::{HashMap, HashSet};
use std::path::Path;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::ai::commit_message::{self, CommitMessageContext};
use crate::credentials::{provider_token_key, CredentialStore, KeyringStore};
use crate::database::snapshots::{SnapshotRecord, SnapshotUpsert};
use crate::database::{
    app_settings, excludes, integration_accounts, profiles, runs, settings, snapshots, sources,
};
use crate::errors::{AppError, AppResult, BackupFileIssue};
use crate::git;
use crate::github::lfs;
use crate::integrations::provider_api;
use crate::models::{
    BackupProfile, BackupRun, BackupSource, GitProvider, IntegrationAccount, IntegrationAuthMethod,
};
use crate::scanner::{self, ScannedFile};
use crate::state::AppState;
use crate::timezone::ConfiguredTimeZone;

const LARGE_FILE_WARN_BYTES: i64 = 50 * 1024 * 1024;
const GIT_LFS_THRESHOLD_BYTES: i64 = 100 * 1024 * 1024;

/// Paths reported by the native watcher, grouped by source. These files are
/// hashed even when size and mtime appear unchanged, preserving the scanner's
/// fast path for every other file.
pub type ChangeHints = HashMap<i64, HashSet<String>>;
pub const FORCE_HASH_ALL: &str = "\0nexthive-force-all";

fn snapshot_location(
    date: &str,
    continuous_backup_enabled: bool,
    is_change_backup: bool,
) -> String {
    if continuous_backup_enabled && is_change_backup {
        format!("{date}{}", workspace::HOT_BACKUP_SUFFIX)
    } else {
        date.to_string()
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProgressPayload {
    profile_id: i64,
    run_id: i64,
    stage: &'static str,
    files_scanned: Option<usize>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CompletedPayload {
    profile_id: i64,
    run: BackupRun,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FailedPayload {
    profile_id: i64,
    run_id: i64,
    message: String,
    file_issue: Option<BackupFileIssue>,
}

fn emit_progress(app: &AppHandle, profile_id: i64, run_id: i64, stage: &'static str) {
    let _ = app.emit(
        "backup-progress",
        ProgressPayload {
            profile_id,
            run_id,
            stage,
            files_scanned: None,
        },
    );
}

/// Run a backup for a profile. Heavy work happens on a blocking thread.
pub async fn run(app: AppHandle, profile_id: i64, trigger: &'static str) -> AppResult<BackupRun> {
    run_with_hints(app, profile_id, trigger, None).await
}

pub async fn run_continuous(
    app: AppHandle,
    profile_id: i64,
    hints: ChangeHints,
) -> AppResult<BackupRun> {
    run_with_hints(app, profile_id, "change", Some(hints)).await
}

async fn run_with_hints(
    app: AppHandle,
    profile_id: i64,
    trigger: &'static str,
    change_hints: Option<ChangeHints>,
) -> AppResult<BackupRun> {
    tauri::async_runtime::spawn_blocking(move || {
        run_blocking(&app, profile_id, trigger, change_hints)
    })
    .await
    .map_err(|e| AppError::internal(format!("backup task panicked: {e}")))?
}

fn run_blocking(
    app: &AppHandle,
    profile_id: i64,
    trigger: &str,
    change_hints: Option<ChangeHints>,
) -> AppResult<BackupRun> {
    let state = app.state::<AppState>();
    let _lock = state.try_start_backup(profile_id)?;

    // Validate configuration before recording anything.
    let profile = state.db.with(|conn| profiles::get(conn, profile_id))?;
    let profile_sources: Vec<BackupSource> = state
        .db
        .with(|conn| sources::list_for_profile(conn, profile_id))?
        .into_iter()
        .filter(|source| source.enabled)
        .collect();
    if profile_sources.is_empty() {
        return Err(AppError::Validation(
            "This profile has no folders yet. Add at least one folder to back up.".into(),
        ));
    }
    let (Some(owner), Some(repo_name)) = (
        profile.repository_owner.clone(),
        profile.repository_name.clone(),
    ) else {
        return Err(AppError::Validation(
            "This profile has no repository yet. Choose or create one first.".into(),
        ));
    };
    let Some(account_id) = profile.integration_account_id else {
        return Err(AppError::Validation(
            "Link a Git provider account to this profile first.".into(),
        ));
    };
    let account = state
        .db
        .with(|conn| integration_accounts::get(conn, account_id))?;
    if account.auth_method != IntegrationAuthMethod::Pat {
        return Err(AppError::Validation(
            "Pushing over SSH is not supported yet — it arrives in an upcoming update. \
             Link a token-based account to this profile."
                .into(),
        ));
    }
    let Some(token) = KeyringStore.get_secret(&provider_token_key(account.provider, account_id))?
    else {
        return Err(AppError::Validation(
            "No token is stored for the linked account. Remove it and add it again.".into(),
        ));
    };

    log::info!("backup started for profile #{profile_id} (trigger: {trigger})");
    let run = state
        .db
        .with(|conn| runs::insert_running(conn, profile_id))?;

    let outcome = pipeline(
        app,
        &state,
        &profile,
        &profile_sources,
        &owner,
        &repo_name,
        &account,
        &token,
        run.id,
        trigger,
        change_hints.as_ref(),
    );

    match outcome {
        Ok(counts) => {
            let finished = state.db.with(|conn| {
                runs::complete_success(
                    conn,
                    run.id,
                    counts.added,
                    counts.modified,
                    counts.deleted,
                    counts.bytes,
                    counts.commit_sha.as_deref(),
                )
            })?;
            log::info!(
                "backup #{} succeeded: +{} ~{} -{}",
                run.id,
                counts.added,
                counts.modified,
                counts.deleted
            );
            let _ = app.emit(
                "backup-completed",
                CompletedPayload {
                    profile_id,
                    run: finished.clone(),
                },
            );
            Ok(finished)
        }
        Err(error) => {
            // Display text is the safe, user-facing message by design.
            let message = error.user_message();
            let _ = state
                .db
                .with(|conn| runs::complete_failed(conn, run.id, &message));
            let file_issue = error.file_issue();
            let _ = app.emit(
                "backup-failed",
                FailedPayload {
                    profile_id,
                    run_id: run.id,
                    message,
                    file_issue,
                },
            );
            Err(error)
        }
    }
}

struct PipelineCounts {
    added: i64,
    modified: i64,
    deleted: i64,
    bytes: i64,
    commit_sha: Option<String>,
}

struct SourceDiff {
    source_id: i64,
    /// (file, hash) pairs new to the snapshot state.
    added: Vec<(ScannedFile, String)>,
    /// (file, hash) pairs whose content changed.
    modified: Vec<(ScannedFile, String)>,
    /// Metadata-only changes — snapshot refresh, content identical.
    refreshed: Vec<(ScannedFile, String)>,
    /// Untouched files — carried into the day's snapshot via hard links.
    unchanged: Vec<(ScannedFile, String)>,
    /// Relative paths that disappeared from the source.
    deleted: Vec<String>,
}

#[allow(clippy::too_many_arguments)]
fn pipeline(
    app: &AppHandle,
    state: &AppState,
    profile: &BackupProfile,
    profile_sources: &[BackupSource],
    owner: &str,
    repo_name: &str,
    account: &IntegrationAccount,
    token: &str,
    run_id: i64,
    trigger: &str,
    change_hints: Option<&ChangeHints>,
) -> AppResult<PipelineCounts> {
    let profile_id = profile.id;

    // --- Scan + diff ---------------------------------------------------
    emit_progress(app, profile_id, run_id, "scanning");
    let mut diffs: Vec<SourceDiff> = Vec::new();
    let mut total_scanned = 0usize;
    for source in profile_sources {
        let root = Path::new(&source.path);
        if !root.is_dir() {
            return Err(AppError::Validation(format!(
                "Source folder \"{}\" no longer exists or is inaccessible.",
                source.path
            )));
        }
        let rules = state
            .db
            .with(|conn| excludes::rules_for_source(conn, source.id))?;
        let matcher = if rules.is_empty() {
            None
        } else {
            Some(scanner::excludes::build_rules_matcher(&rules)?)
        };
        let scanned = scanner::scan_source(
            source.id,
            root,
            source.scan_mode,
            matcher.as_ref(),
            |count| {
                let _ = app.emit(
                    "backup-progress",
                    ProgressPayload {
                        profile_id,
                        run_id,
                        stage: "scanning",
                        files_scanned: Some(total_scanned + count),
                    },
                );
            },
        )?;
        total_scanned += scanned.len();

        let stored = state
            .db
            .with(|conn| snapshots::map_for_source(conn, source.id))?;
        diffs.push(diff_source(
            source,
            scanned,
            stored,
            change_hints.and_then(|hints| hints.get(&source.id)),
        )?);
    }

    let expected_paths = expected_snapshot_paths(&diffs)?;

    let added: i64 = diffs.iter().map(|d| d.added.len() as i64).sum();
    let modified: i64 = diffs.iter().map(|d| d.modified.len() as i64).sum();
    let deleted: i64 = diffs.iter().map(|d| d.deleted.len() as i64).sum();
    let bytes: i64 = diffs
        .iter()
        .flat_map(|d| d.added.iter().chain(d.modified.iter()))
        .map(|(file, _)| file.size)
        .sum();

    // The built-in LFS transport currently targets GitHub. Check every file,
    // including unchanged files carried into a new provider workspace, so a
    // provider switch can never report success with missing LFS objects.
    if account.provider != GitProvider::GitHub {
        for diff in &diffs {
            for (file, _) in diff
                .added
                .iter()
                .chain(diff.modified.iter())
                .chain(diff.unchanged.iter())
                .chain(diff.refreshed.iter())
            {
                if file.size >= GIT_LFS_THRESHOLD_BYTES {
                    return Err(AppError::backup_file(
                        format!(
                            "{} Git LFS upload is not supported yet. Exclude this file or use GitHub for files at or above 100 MiB.",
                            account.provider.display_name()
                        ),
                        diff.source_id,
                        &file.relative_path,
                        "provider-specific Git LFS transport is unavailable",
                    ));
                }
            }
        }
    }

    // 50-100 MiB files remain regular Git blobs and are logged as warnings.
    for diff in &diffs {
        for (file, _) in diff.added.iter().chain(diff.modified.iter()) {
            if file.size > LARGE_FILE_WARN_BYTES && file.size < GIT_LFS_THRESHOLD_BYTES {
                log::warn!(
                    "large file in backup (allowed, {} MB), source #{}: {}",
                    file.size / (1024 * 1024),
                    diff.source_id,
                    file.relative_path
                );
            }
        }
    }

    // Collect snapshot mutations now; they are applied only after a
    // successful push (or immediately when nothing needed pushing).
    let mut upserts: Vec<SnapshotUpsert> = Vec::new();
    let mut deletes: Vec<(i64, String)> = Vec::new();
    for diff in &diffs {
        for (file, hash) in diff
            .added
            .iter()
            .chain(diff.modified.iter())
            .chain(diff.refreshed.iter())
        {
            upserts.push(SnapshotUpsert {
                source_id: diff.source_id,
                relative_path: file.relative_path.clone(),
                hash: hash.clone(),
                size: file.size,
                modified_at: file.modified_at,
            });
        }
        for relative in &diff.deleted {
            deletes.push((diff.source_id, relative.clone()));
        }
    }

    let profile_settings = state.db.with(|conn| settings::get(conn, profile_id))?;
    let configured_time_zone = state
        .db
        .with(|conn| app_settings::get(conn).map(|settings| settings.time_zone))
        .and_then(|value| ConfiguredTimeZone::parse(&value))
        .unwrap_or(ConfiguredTimeZone::System);
    let clock = configured_time_zone.now();
    let today = clock.date.to_string();
    let is_change_backup = matches!(trigger, "change" | "change-catch-up");
    let snapshot_relative = snapshot_location(
        &today,
        profile_settings.continuous_backup_enabled,
        is_change_backup,
    );

    let data_dir = app.path().app_data_dir()?;
    let ws = workspace::workspace_dir(&data_dir, profile_id);
    let snapshot_dir = workspace::resolve_snapshot_path(&ws, &snapshot_relative)?;
    let snapshot_already_exists = snapshot_dir.is_dir();
    let layout_is_current = workspace::snapshot_matches(&snapshot_dir, &expected_paths)?;

    if added == 0
        && modified == 0
        && deleted == 0
        && (is_change_backup || (snapshot_already_exists && layout_is_current))
    {
        // Nothing changed and today's snapshot already exists: refresh
        // metadata-only entries but never create an empty commit.
        state
            .db
            .with(|conn| snapshots::apply_changes(conn, &upserts, &deletes))?;
        return Ok(PipelineCounts {
            added,
            modified,
            deleted,
            bytes,
            commit_sha: None,
        });
    }

    // --- Sync the dated snapshot folder --------------------------------
    emit_progress(app, profile_id, run_id, "syncing");
    std::fs::create_dir_all(&ws)?;
    workspace::prune_workspace_roots(&ws)?;
    let repository = git::open_or_init(&ws, &profile.branch)?;

    let confirmed_relative = state
        .db
        .with(|conn| settings::last_snapshot_path(conn, profile_id))?;
    let mut previous_snapshot = confirmed_relative
        .as_deref()
        .map(|relative| workspace::resolve_snapshot_path(&ws, relative))
        .transpose()?
        .filter(|path| path.is_dir());
    // A stale target root may not match the latest confirmed snapshot.
    // Rebuild it from that confirmed baseline so unchanged files can never
    // silently retain old content when alternating hot and dated backups.
    if previous_snapshot.as_deref() != Some(snapshot_dir.as_path()) {
        if previous_snapshot
            .as_deref()
            .is_some_and(|previous| previous.starts_with(&snapshot_dir))
        {
            // A legacy nested snapshot makes the new flat date root its
            // ancestor. Rebuild from source to avoid linking into a directory
            // that is about to be replaced.
            previous_snapshot = None;
        }
        if snapshot_dir.is_dir() {
            std::fs::remove_dir_all(&snapshot_dir)?;
        }
    }
    workspace::prune_snapshot_files(&snapshot_dir, &expected_paths)?;
    let mut lfs_uploads = Vec::new();

    for diff in &diffs {
        for (file, hash) in diff.added.iter().chain(diff.modified.iter()) {
            if file.size >= GIT_LFS_THRESHOLD_BYTES {
                let object_path = workspace::store_lfs_object(
                    repository.path(),
                    hash,
                    file.size,
                    &file.absolute_path,
                )
                .map_err(|error| file_error(diff.source_id, file, "prepare", error))?;
                workspace::write_lfs_pointer(&snapshot_dir, &file.relative_path, hash, file.size)
                    .map_err(|error| file_error(diff.source_id, file, "write pointer for", error))?;
                lfs_uploads.push((
                    diff.source_id,
                    file.relative_path.clone(),
                    hash.clone(),
                    file.size,
                    object_path,
                ));
            } else {
                workspace::copy_into(&snapshot_dir, &file.relative_path, &file.absolute_path)
                    .map_err(|error| file_error(diff.source_id, file, "copy", error))?;
            }
        }
        // Carry unchanged content into today's snapshot without paying its
        // disk cost twice: hard-link from the previous snapshot.
        for (file, hash) in diff.unchanged.iter().chain(diff.refreshed.iter()) {
            if file.size >= GIT_LFS_THRESHOLD_BYTES {
                workspace::write_lfs_pointer(&snapshot_dir, &file.relative_path, hash, file.size)
                    .map_err(|error| file_error(diff.source_id, file, "write pointer for", error))?;
            } else {
                workspace::link_or_copy_unchanged(
                    &snapshot_dir,
                    previous_snapshot.as_deref(),
                    &file.relative_path,
                    &file.absolute_path,
                )
                .map_err(|error| file_error(diff.source_id, file, "copy", error))?;
            }
        }
    }

    if !lfs_uploads.is_empty() {
        emit_progress(app, profile_id, run_id, "uploadingLargeFiles");
        for (source_id, relative_path, oid, size, object_path) in &lfs_uploads {
            lfs::upload_object(
                owner,
                repo_name,
                &profile.branch,
                token,
                oid,
                *size,
                object_path,
            )
            .map_err(|error| {
                AppError::backup_file(
                    "A large file could not be uploaded with Git LFS. You can retry, check the repository owner's LFS quota, or exclude this file.",
                    *source_id,
                    relative_path,
                    format!("{error:?}"),
                )
            })?;
        }
    }

    // --- Commit ---------------------------------------------------------
    emit_progress(app, profile_id, run_id, "committing");
    let mut changed_paths = Vec::with_capacity((added + modified + deleted) as usize);
    for diff in &diffs {
        changed_paths.extend(
            diff.added
                .iter()
                .map(|(file, _)| ("added", file.relative_path.clone())),
        );
        changed_paths.extend(
            diff.modified
                .iter()
                .map(|(file, _)| ("modified", file.relative_path.clone())),
        );
        changed_paths.extend(diff.deleted.iter().map(|path| ("deleted", path.clone())));
    }
    changed_paths.sort_by(|left, right| left.1.cmp(&right.1));
    let commit_context = CommitMessageContext {
        profile_name: &profile.name,
        trigger,
        date: &today,
        time: &clock.hhmm,
        added,
        modified,
        deleted,
        changes: changed_paths,
    };
    let message = commit_message::generate_or_fallback(
        app,
        &profile_settings,
        &commit_context,
        is_change_backup,
    );
    let commit_sha = git::commit_all(&repository, &message)?;
    let confirmed_sha = commit_sha.clone().or_else(|| {
        repository
            .head()
            .ok()
            .and_then(|head| head.target())
            .map(|oid| oid.to_string())
    });

    // --- Push -----------------------------------------------------------
    if confirmed_sha.is_some() {
        emit_progress(app, profile_id, run_id, "pushing");
        let url = provider_api::repository_clone_url(&account.base_url, owner, repo_name)?;
        let git_username =
            provider_api::git_username(account.provider, account.username.as_deref());
        git::push_https_with_token(&repository, &url, &profile.branch, &git_username, token).map_err(
            |error| match &error {
                AppError::Git(inner) => {
                    let text = inner.message().to_lowercase();
                    if text.contains("fast-forward")
                        || text.contains("fetch first")
                        || text.contains("commits that are not present locally")
                        || text.contains("reference that you are trying to update")
                    {
                        AppError::Integration(format!(
                            "The repository on {} contains newer or different commits that \
                             are not in NextHive's local workspace. NextHive did not overwrite \
                             that history. Choose an empty backup repository or reconcile the \
                             repository history before trying again.",
                            account.provider.display_name()
                        ))
                    } else if text.contains("auth") || text.contains("401") || text.contains("403")
                    {
                        AppError::Integration(format!(
                            "{} rejected the push. The token may be expired or missing repository write access.",
                            account.provider.display_name()
                        ))
                    } else {
                        error
                    }
                }
                _ => error,
            },
        )?;
    }

    // --- Confirm state ---------------------------------------------------
    state.db.with(|conn| {
        snapshots::apply_changes_with_snapshot(
            conn,
            profile_id,
            &snapshot_relative,
            &upserts,
            &deletes,
        )
    })?;

    Ok(PipelineCounts {
        added,
        modified,
        deleted,
        bytes,
        commit_sha: confirmed_sha,
    })
}

fn file_error(source_id: i64, file: &ScannedFile, action: &str, error: AppError) -> AppError {
    log::error!(
        "could not {action} source #{source_id} path {}: {error:?}",
        file.relative_path
    );
    AppError::backup_file(
        format!(
            "NextHive could not {action} \"{}\". Exclude it or fix the file, then try again.",
            file.relative_path
        ),
        source_id,
        &file.relative_path,
        format!("{error:?}"),
    )
}

fn diff_source(
    source: &BackupSource,
    scanned: Vec<ScannedFile>,
    stored: HashMap<String, SnapshotRecord>,
    force_hash: Option<&HashSet<String>>,
) -> AppResult<SourceDiff> {
    let mut diff = SourceDiff {
        source_id: source.id,
        added: Vec::new(),
        modified: Vec::new(),
        refreshed: Vec::new(),
        unchanged: Vec::new(),
        deleted: Vec::new(),
    };

    let mut seen: std::collections::HashSet<&str> = std::collections::HashSet::new();
    for file in &scanned {
        seen.insert(file.relative_path.as_str());
    }
    for relative in stored.keys() {
        if !seen.contains(relative.as_str()) {
            diff.deleted.push(relative.clone());
        }
    }

    for file in scanned {
        match stored.get(&file.relative_path) {
            None => {
                let hash = scanner::hash_file(&file.absolute_path)
                    .map_err(|error| file_error(source.id, &file, "read", error))?;
                diff.added.push((file, hash));
            }
            Some(record) => {
                // Fast path: size + mtime unchanged → assume identical.
                if record.size == file.size
                    && record.modified_at == file.modified_at
                    && !force_hash.is_some_and(|paths| {
                        paths.contains(FORCE_HASH_ALL) || paths.contains(&file.relative_path)
                    })
                {
                    diff.unchanged.push((file, record.hash.clone()));
                    continue;
                }
                let hash = scanner::hash_file(&file.absolute_path)
                    .map_err(|error| file_error(source.id, &file, "read", error))?;
                if hash == record.hash {
                    diff.refreshed.push((file, hash));
                } else {
                    diff.modified.push((file, hash));
                }
            }
        }
    }
    Ok(diff)
}

/// Dated snapshots contain the selected folders' contents directly. That
/// means two sources cannot safely contribute the same relative path. Fail
/// explicitly instead of allowing one source to overwrite the other.
fn expected_snapshot_paths(diffs: &[SourceDiff]) -> AppResult<HashSet<String>> {
    let mut owners: HashMap<String, i64> = HashMap::new();
    let mut expected = HashSet::new();

    for diff in diffs {
        for (file, _) in diff
            .added
            .iter()
            .chain(diff.modified.iter())
            .chain(diff.refreshed.iter())
            .chain(diff.unchanged.iter())
        {
            let collision_key = file.relative_path.to_lowercase();
            if let Some(other_source_id) = owners.get(&collision_key) {
                if *other_source_id != diff.source_id {
                    log::error!(
                        "flat snapshot path collision between sources #{} and #{}: {}",
                        other_source_id,
                        diff.source_id,
                        file.relative_path
                    );
                    return Err(AppError::backup_file(
                        format!(
                            "Two selected folders both contain \"{}\". Date folders store the selected folders' contents directly, so one copy would overwrite the other. Put the folders in separate profiles or exclude one copy.",
                            file.relative_path
                        ),
                        diff.source_id,
                        &file.relative_path,
                        format!(
                            "relative path collision between source #{} and source #{}",
                            other_source_id, diff.source_id
                        ),
                    ));
                }
            } else {
                owners.insert(collision_key, diff.source_id);
            }
            expected.insert(file.relative_path.clone());
        }
    }

    Ok(expected)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn continuous_backups_separate_fast_and_major_snapshots() {
        assert_eq!(
            snapshot_location("2026-08-08", true, true),
            "2026-08-08-hot"
        );
        assert_eq!(snapshot_location("2026-08-08", true, false), "2026-08-08");
        assert_eq!(snapshot_location("2026-08-08", false, true), "2026-08-08");
    }

    #[test]
    fn watcher_hints_force_hash_when_fast_metadata_looks_unchanged() {
        let path = std::env::temp_dir().join(format!(
            "nexthive-forced-hash-{}-{}.txt",
            std::process::id(),
            Utc::now().timestamp_nanos_opt().unwrap()
        ));
        std::fs::write(&path, b"hello").unwrap();
        let modified_at = Utc::now();
        let source = BackupSource {
            id: 1,
            profile_id: 1,
            path: path.parent().unwrap().display().to_string(),
            enabled: true,
            exclude_profile_id: None,
            scan_mode: crate::models::SourceScanMode::Recursive,
            created_at: Utc::now(),
        };
        let file = ScannedFile {
            relative_path: "forced.txt".into(),
            absolute_path: path.clone(),
            size: 5,
            modified_at,
        };
        let stored = HashMap::from([(
            "forced.txt".into(),
            SnapshotRecord {
                // SHA-256 for "world" — same size, different content.
                hash: "486ea46224d1bb4fb680f34f7c9ad96a8f24ec88be73ea8e5a6c65260e9cb8a7".into(),
                size: 5,
                modified_at,
            },
        )]);
        let forced = HashSet::from(["forced.txt".to_string()]);

        let diff = diff_source(&source, vec![file], stored, Some(&forced)).unwrap();
        assert_eq!(diff.modified.len(), 1);
        assert!(diff.unchanged.is_empty());

        let _ = std::fs::remove_file(path);
    }
}
