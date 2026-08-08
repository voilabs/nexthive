//! Automatic profile reconciliation.
//!
//! Each enabled rule observes one root folder. Immediate child directories
//! become ordinary recursive backup profiles, while direct root files belong
//! to one generated profile that uses the `direct_files` source mode.

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};
use tokio::time::MissedTickBehavior;

use crate::database::{automatic_profiles, profiles, settings, sources};
use crate::errors::{AppError, AppResult};
use crate::integrations::repositories;
use crate::models::{
    AutomaticProfileEntryKind, AutomaticProfileMember, AutomaticProfileMemberStatus,
    AutomaticProfileSyncResult, CreateBackupProfileInput, SaveAutomaticProfileRuleInput,
    SourceScanMode, UpdateBackupProfileInput, UpdateBackupSettingsInput,
};
use crate::state::AppState;

const RECONCILE_INTERVAL: Duration = Duration::from_secs(5);
const REPOSITORY_RETRY_DELAY: chrono::Duration = chrono::Duration::minutes(1);
const ROOT_FILES_KEY: &str = "root-files";

#[derive(Clone)]
struct DiscoveredEntry {
    key: String,
    name: String,
    path: PathBuf,
    kind: AutomaticProfileEntryKind,
}

#[derive(Default)]
struct SyncCounts {
    profiles_created: usize,
    profiles_reactivated: usize,
    profiles_marked_missing: usize,
    repositories_created: usize,
}

struct EnsuredMember {
    member: AutomaticProfileMember,
    profile_created: bool,
    was_reactivated: bool,
}

pub fn start(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(RECONCILE_INTERVAL);
        interval.set_missed_tick_behavior(MissedTickBehavior::Skip);
        loop {
            interval.tick().await;
            let ids = {
                let state = app.state::<AppState>();
                state.db.with(|conn| automatic_profiles::enabled_ids(conn))
            };
            let ids = match ids {
                Ok(ids) => ids,
                Err(error) => {
                    log::error!("automatic profile rules could not be loaded: {error:?}");
                    continue;
                }
            };
            for id in ids {
                if let Err(error) = reconcile_rule_inner(app.clone(), id, false).await {
                    log::warn!("automatic profile rule #{id} could not be reconciled: {error:?}");
                }
            }
        }
    });
}

pub fn save_rule(
    app: &AppHandle,
    id: Option<i64>,
    mut input: SaveAutomaticProfileRuleInput,
) -> AppResult<i64> {
    let canonical = crate::scanner::validate_source_path(&input.root_path)?;
    input.root_path = canonical.to_string_lossy().into_owned();
    let state = app.state::<AppState>();
    let rule = state.db.with(|conn| match id {
        Some(id) => automatic_profiles::update(conn, id, &input),
        None => automatic_profiles::create(conn, &input),
    })?;
    if !rule.enabled {
        pause_members(app, rule.id)?;
    }
    Ok(rule.id)
}

pub fn pause_members(app: &AppHandle, rule_id: i64) -> AppResult<()> {
    let state = app.state::<AppState>();
    state.db.with(|conn| {
        for member in automatic_profiles::list_members(conn, rule_id)? {
            if let Some(profile_id) = member.profile_id {
                if profiles::get(conn, profile_id).is_ok() {
                    profiles::update(
                        conn,
                        profile_id,
                        &UpdateBackupProfileInput {
                            enabled: Some(false),
                            ..Default::default()
                        },
                    )?;
                }
            }
        }
        Ok(())
    })
}

pub async fn reconcile_rule(app: AppHandle, rule_id: i64) -> AppResult<AutomaticProfileSyncResult> {
    reconcile_rule_inner(app, rule_id, true).await
}

async fn reconcile_rule_inner(
    app: AppHandle,
    rule_id: i64,
    force_repository_retry: bool,
) -> AppResult<AutomaticProfileSyncResult> {
    let state = app.state::<AppState>();
    let _slot = state.try_start_automatic_sync(rule_id)?;
    let outcome = reconcile_unlocked(&app, rule_id, force_repository_retry).await;
    if let Err(error) = &outcome {
        let safe_message = error.user_message();
        let _ = state
            .db
            .with(|conn| automatic_profiles::finish_reconcile(conn, rule_id, Some(&safe_message)));
        if let Ok(rule) = state.db.with(|conn| automatic_profiles::get(conn, rule_id)) {
            let _ = app.emit("automatic-profiles-changed", rule);
        }
    }
    outcome
}

async fn reconcile_unlocked(
    app: &AppHandle,
    rule_id: i64,
    force_repository_retry: bool,
) -> AppResult<AutomaticProfileSyncResult> {
    let state = app.state::<AppState>();
    let rule = state
        .db
        .with(|conn| automatic_profiles::get(conn, rule_id))?;
    if !rule.enabled {
        pause_members(app, rule_id)?;
        return Ok(AutomaticProfileSyncResult {
            rule,
            profiles_created: 0,
            profiles_reactivated: 0,
            profiles_marked_missing: 0,
            repositories_created: 0,
        });
    }

    let root = PathBuf::from(&rule.root_path);
    let rule_name = rule.name.clone();
    let discovery =
        tauri::async_runtime::spawn_blocking(move || discover_entries(&root, &rule_name))
            .await
            .map_err(|error| {
                AppError::internal(format!("automatic profile discovery panicked: {error}"))
            })?;
    let entries = match discovery {
        Ok(entries) => entries,
        Err(error) => {
            mark_all_members_missing(app, rule_id)?;
            return Err(error);
        }
    };

    let desired_keys = entries
        .iter()
        .map(|entry| entry.key.clone())
        .collect::<HashSet<_>>();
    let mut counts = SyncCounts::default();
    let mut initial_backups = Vec::new();

    for entry in entries {
        if !force_repository_retry && repository_retry_is_deferred(app, &rule, &entry)? {
            continue;
        }
        let ensured = if let Some(member) = current_member(app, &rule, &entry)? {
            EnsuredMember {
                member,
                profile_created: false,
                was_reactivated: false,
            }
        } else {
            ensure_member(app, &rule, &entry)?
        };
        if ensured.profile_created {
            counts.profiles_created += 1;
        } else if ensured.was_reactivated {
            counts.profiles_reactivated += 1;
        }

        let Some(profile_id) = ensured.member.profile_id else {
            continue;
        };
        let profile = state.db.with(|conn| profiles::get(conn, profile_id))?;
        if rule.auto_create_repositories && profile.repository_name.is_none() {
            match repositories::create_for_profile(app, profile_id).await {
                Ok(_) => {
                    counts.repositories_created += 1;
                    initial_backups.push(profile_id);
                    state.db.with(|conn| {
                        automatic_profiles::update_member(
                            conn,
                            ensured.member.id,
                            &entry.name,
                            entry.kind,
                            Some(profile_id),
                            ensured.member.source_id,
                            &entry.path.to_string_lossy(),
                            AutomaticProfileMemberStatus::Active,
                            None,
                        )
                    })?;
                }
                Err(error) => {
                    let message = error.user_message();
                    state.db.with(|conn| {
                        automatic_profiles::update_member(
                            conn,
                            ensured.member.id,
                            &entry.name,
                            entry.kind,
                            Some(profile_id),
                            ensured.member.source_id,
                            &entry.path.to_string_lossy(),
                            AutomaticProfileMemberStatus::Error,
                            Some(&message),
                        )
                    })?;
                }
            }
        }
    }

    for member in state
        .db
        .with(|conn| automatic_profiles::list_members(conn, rule_id))?
    {
        if desired_keys.contains(&member.entry_key) {
            continue;
        }
        state.db.with(|conn| {
            if let Some(profile_id) = member.profile_id {
                if profiles::get(conn, profile_id).is_ok() {
                    profiles::update(
                        conn,
                        profile_id,
                        &UpdateBackupProfileInput {
                            enabled: Some(false),
                            ..Default::default()
                        },
                    )?;
                }
            }
            automatic_profiles::update_member(
                conn,
                member.id,
                &member.entry_name,
                member.entry_kind,
                member.profile_id,
                member.source_id,
                &member.source_path,
                AutomaticProfileMemberStatus::Missing,
                Some("The source folder is no longer present under the automatic profile root."),
            )
        })?;
        if member.status != AutomaticProfileMemberStatus::Missing {
            counts.profiles_marked_missing += 1;
        }
    }

    state
        .db
        .with(|conn| automatic_profiles::finish_reconcile(conn, rule_id, None))?;
    let refreshed_rule = state
        .db
        .with(|conn| automatic_profiles::get(conn, rule_id))?;
    let _ = app.emit("automatic-profiles-changed", &refreshed_rule);

    if !initial_backups.is_empty() {
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            for profile_id in initial_backups {
                if let Err(error) =
                    crate::backup::run(app.clone(), profile_id, "automatic-profile").await
                {
                    log::warn!(
                        "initial automatic backup failed for profile #{profile_id}: {error:?}"
                    );
                }
            }
        });
    }

    Ok(AutomaticProfileSyncResult {
        rule: refreshed_rule,
        profiles_created: counts.profiles_created,
        profiles_reactivated: counts.profiles_reactivated,
        profiles_marked_missing: counts.profiles_marked_missing,
        repositories_created: counts.repositories_created,
    })
}

fn repository_retry_is_deferred(
    app: &AppHandle,
    rule: &crate::models::AutomaticProfileRule,
    entry: &DiscoveredEntry,
) -> AppResult<bool> {
    let state = app.state::<AppState>();
    state.db.with(|conn| {
        let Some(member) = automatic_profiles::get_member(conn, rule.id, &entry.key)? else {
            return Ok(false);
        };
        Ok(member.status == AutomaticProfileMemberStatus::Error
            && member.updated_at >= rule.updated_at
            && chrono::Utc::now() - member.updated_at < REPOSITORY_RETRY_DELAY)
    })
}

fn mark_all_members_missing(app: &AppHandle, rule_id: i64) -> AppResult<()> {
    let state = app.state::<AppState>();
    state.db.with(|conn| {
        for member in automatic_profiles::list_members(conn, rule_id)? {
            if let Some(profile_id) = member.profile_id {
                if profiles::get(conn, profile_id).is_ok_and(|profile| profile.enabled) {
                    profiles::update(
                        conn,
                        profile_id,
                        &UpdateBackupProfileInput {
                            enabled: Some(false),
                            ..Default::default()
                        },
                    )?;
                }
            }
            if member.status != AutomaticProfileMemberStatus::Missing {
                automatic_profiles::update_member(
                    conn,
                    member.id,
                    &member.entry_name,
                    member.entry_kind,
                    member.profile_id,
                    member.source_id,
                    &member.source_path,
                    AutomaticProfileMemberStatus::Missing,
                    Some("The automatic profile root is missing or inaccessible."),
                )?;
            }
        }
        Ok(())
    })
}

fn discover_entries(root: &Path, rule_name: &str) -> AppResult<Vec<DiscoveredEntry>> {
    if !root.is_dir() {
        return Err(AppError::Validation(
            "The automatic profile root is missing or inaccessible.".into(),
        ));
    }
    let mut entries = vec![DiscoveredEntry {
        key: ROOT_FILES_KEY.into(),
        name: rule_name.into(),
        path: root.to_path_buf(),
        kind: AutomaticProfileEntryKind::RootFiles,
    }];
    for entry in std::fs::read_dir(root)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        if !file_type.is_dir() || file_type.is_symlink() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().into_owned();
        if crate::scanner::is_default_ignored_relative(&name) {
            continue;
        }
        entries.push(DiscoveredEntry {
            key: format!("directory:{name}"),
            name,
            path: entry.path(),
            kind: AutomaticProfileEntryKind::Directory,
        });
    }
    entries[1..].sort_by_key(|entry| entry.name.to_lowercase());
    Ok(entries)
}

fn current_member(
    app: &AppHandle,
    rule: &crate::models::AutomaticProfileRule,
    entry: &DiscoveredEntry,
) -> AppResult<Option<AutomaticProfileMember>> {
    let state = app.state::<AppState>();
    state.db.with(|conn| {
        let Some(member) = automatic_profiles::get_member(conn, rule.id, &entry.key)? else {
            return Ok(None);
        };
        if member.status != AutomaticProfileMemberStatus::Active
            || member.source_path != entry.path.to_string_lossy()
            || member.updated_at < rule.updated_at
        {
            return Ok(None);
        }
        let (Some(profile_id), Some(source_id)) = (member.profile_id, member.source_id) else {
            return Ok(None);
        };
        let Ok(profile) = profiles::get(conn, profile_id) else {
            return Ok(None);
        };
        let Ok(source) = sources::get(conn, source_id) else {
            return Ok(None);
        };
        let expected_mode = match entry.kind {
            AutomaticProfileEntryKind::RootFiles => SourceScanMode::DirectFiles,
            AutomaticProfileEntryKind::Directory => SourceScanMode::Recursive,
        };
        if !profile.enabled
            || !source.enabled
            || source.profile_id != profile_id
            || source.path != entry.path.to_string_lossy()
            || source.scan_mode != expected_mode
            || source.exclude_profile_id != rule.exclude_profile_id
            || (rule.auto_create_repositories && profile.repository_name.is_none())
        {
            return Ok(None);
        }
        Ok(Some(member))
    })
}

fn ensure_member(
    app: &AppHandle,
    rule: &crate::models::AutomaticProfileRule,
    entry: &DiscoveredEntry,
) -> AppResult<EnsuredMember> {
    let state = app.state::<AppState>();
    state.db.with(|conn| {
        let existing_member = automatic_profiles::get_member(conn, rule.id, &entry.key)?;
        let was_reactivated = existing_member.as_ref().is_some_and(|member| {
            member.status != AutomaticProfileMemberStatus::Active && member.profile_id.is_some()
        });
        let existing_profile = existing_member
            .as_ref()
            .and_then(|member| member.profile_id)
            .and_then(|profile_id| profiles::get(conn, profile_id).ok());
        let display_name = match entry.kind {
            AutomaticProfileEntryKind::RootFiles => rule.name.clone(),
            AutomaticProfileEntryKind::Directory => entry.name.clone(),
        };
        let path = entry.path.to_string_lossy().into_owned();
        let scan_mode = match entry.kind {
            AutomaticProfileEntryKind::RootFiles => SourceScanMode::DirectFiles,
            AutomaticProfileEntryKind::Directory => SourceScanMode::Recursive,
        };

        let (profile, profile_created) = if let Some(profile) = existing_profile {
            let integration_account_id = if profile.repository_name.is_some() {
                profile.integration_account_id
            } else {
                rule.integration_account_id
            };
            (
                profiles::update(
                    conn,
                    profile.id,
                    &UpdateBackupProfileInput {
                        name: Some(display_name.clone()),
                        branch: Some(rule.branch.clone()),
                        enabled: Some(true),
                        integration_account_id: Some(integration_account_id),
                        ..Default::default()
                    },
                )?,
                false,
            )
        } else {
            (
                profiles::create_for_automatic_rule(
                    conn,
                    &CreateBackupProfileInput {
                        name: display_name,
                        repository_owner: None,
                        repository_name: None,
                        repository_url: None,
                        branch: Some(rule.branch.clone()),
                        integration_account_id: rule.integration_account_id,
                    },
                    rule.id,
                )?,
                true,
            )
        };

        let existing_source = existing_member
            .as_ref()
            .and_then(|member| member.source_id)
            .and_then(|source_id| sources::get(conn, source_id).ok())
            .filter(|source| source.profile_id == profile.id);
        let source = if let Some(source) = existing_source {
            sources::update_managed(conn, source.id, &path, rule.exclude_profile_id, scan_mode)?
        } else {
            sources::insert_with_mode(conn, profile.id, &path, rule.exclude_profile_id, scan_mode)?
        };

        settings::update(
            conn,
            profile.id,
            &UpdateBackupSettingsInput {
                backup_time: Some(rule.backup_time.clone()),
                backup_on_startup: Some(rule.backup_on_startup),
                notifications_enabled: Some(rule.notifications_enabled),
                continuous_backup_enabled: Some(rule.continuous_backup_enabled),
                change_debounce_seconds: Some(rule.change_debounce_seconds),
                ai_account_id: Some(rule.ai_account_id),
                ai_major_commit_messages_enabled: Some(rule.ai_major_commit_messages_enabled),
                ai_fast_commit_messages_enabled: Some(rule.ai_fast_commit_messages_enabled),
                ..Default::default()
            },
        )?;

        let member = if let Some(member) = existing_member {
            automatic_profiles::update_member(
                conn,
                member.id,
                &entry.name,
                entry.kind,
                Some(profile.id),
                Some(source.id),
                &path,
                AutomaticProfileMemberStatus::Active,
                None,
            )?;
            automatic_profiles::get_member(conn, rule.id, &entry.key)?.ok_or_else(|| {
                AppError::internal("automatic profile member disappeared after update")
            })?
        } else {
            automatic_profiles::insert_member(
                conn,
                rule.id,
                &entry.key,
                &entry.name,
                entry.kind,
                profile.id,
                source.id,
                &path,
            )?
        };
        Ok(EnsuredMember {
            member,
            profile_created,
            was_reactivated,
        })
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn discovery_splits_root_files_from_immediate_directories() {
        let root =
            std::env::temp_dir().join(format!("nexthive-auto-profile-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(root.join("Project A").join("nested")).unwrap();
        std::fs::create_dir_all(root.join("node_modules")).unwrap();
        std::fs::write(root.join("note.txt"), b"root file").unwrap();

        let entries = discover_entries(&root, "Desktop").unwrap();
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].kind, AutomaticProfileEntryKind::RootFiles);
        assert_eq!(entries[1].name, "Project A");

        let _ = std::fs::remove_dir_all(&root);
    }
}
