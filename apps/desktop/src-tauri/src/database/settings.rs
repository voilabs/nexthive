//! Repository functions for per-profile backup settings.

use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::errors::{AppError, AppResult};
use crate::models::{BackupSettings, UpdateBackupSettingsInput};

fn row_to_settings(row: &Row) -> rusqlite::Result<BackupSettings> {
    Ok(BackupSettings {
        profile_id: row.get("profile_id")?,
        backup_time: row.get("backup_time")?,
        backup_on_startup: row.get::<_, i64>("backup_on_startup")? != 0,
        autostart_enabled: row.get::<_, i64>("autostart_enabled")? != 0,
        notifications_enabled: row.get::<_, i64>("notifications_enabled")? != 0,
        continuous_backup_enabled: row.get::<_, i64>("continuous_backup_enabled")? != 0,
        change_debounce_seconds: row.get("change_debounce_seconds")?,
        ai_account_id: row.get("ai_account_id")?,
        ai_major_commit_messages_enabled: row.get::<_, i64>("ai_major_commit_messages_enabled")?
            != 0,
        ai_fast_commit_messages_enabled: row.get::<_, i64>("ai_fast_commit_messages_enabled")? != 0,
    })
}

pub fn get(conn: &Connection, profile_id: i64) -> AppResult<BackupSettings> {
    let existing = conn
        .query_row(
            "SELECT profile_id, backup_time, backup_on_startup, autostart_enabled, \
                    notifications_enabled, continuous_backup_enabled, change_debounce_seconds, \
                    ai_account_id, ai_major_commit_messages_enabled, \
                    ai_fast_commit_messages_enabled \
             FROM backup_settings WHERE profile_id = ?1",
            params![profile_id],
            row_to_settings,
        )
        .optional()?;
    if let Some(settings) = existing {
        return Ok(settings);
    }
    // Self-heal: profiles created before settings rows existed.
    conn.execute(
        "INSERT INTO backup_settings (profile_id) VALUES (?1)",
        params![profile_id],
    )?;
    get(conn, profile_id)
}

/// Settings rows for every enabled profile — read by the scheduler.
pub fn list_enabled(conn: &Connection) -> AppResult<Vec<BackupSettings>> {
    let mut stmt = conn.prepare(
        "SELECT s.profile_id, s.backup_time, s.backup_on_startup, s.autostart_enabled, \
                s.notifications_enabled, s.continuous_backup_enabled, \
                s.change_debounce_seconds, s.ai_account_id, \
                s.ai_major_commit_messages_enabled, s.ai_fast_commit_messages_enabled \
         FROM backup_settings s \
         JOIN backup_profiles p ON p.id = s.profile_id \
         WHERE p.enabled = 1",
    )?;
    let settings = stmt
        .query_map([], row_to_settings)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(settings)
}

fn validate_backup_time(value: &str) -> AppResult<()> {
    let valid = matches!(value.split_once(':'), Some((h, m))
        if h.len() == 2 && m.len() == 2
            && h.parse::<u8>().is_ok_and(|h| h < 24)
            && m.parse::<u8>().is_ok_and(|m| m < 60));
    if valid {
        Ok(())
    } else {
        Err(AppError::Validation(
            "Backup time must be in HH:MM format.".into(),
        ))
    }
}

pub fn update(
    conn: &Connection,
    profile_id: i64,
    input: &UpdateBackupSettingsInput,
) -> AppResult<BackupSettings> {
    let existing = get(conn, profile_id)?;

    let backup_time = match &input.backup_time {
        Some(Some(time)) => {
            validate_backup_time(time)?;
            Some(time.clone())
        }
        Some(None) => None,
        None => existing.backup_time,
    };
    let backup_on_startup = input
        .backup_on_startup
        .unwrap_or(existing.backup_on_startup);
    let autostart_enabled = input
        .autostart_enabled
        .unwrap_or(existing.autostart_enabled);
    let notifications_enabled = input
        .notifications_enabled
        .unwrap_or(existing.notifications_enabled);
    let continuous_backup_enabled = input
        .continuous_backup_enabled
        .unwrap_or(existing.continuous_backup_enabled);
    let change_debounce_seconds = input
        .change_debounce_seconds
        .unwrap_or(existing.change_debounce_seconds);
    if !(5..=3600).contains(&change_debounce_seconds) {
        return Err(AppError::Validation(
            "Change stacking time must be between 5 seconds and 60 minutes.".into(),
        ));
    }
    let ai_account_id = match input.ai_account_id {
        Some(Some(account_id)) => {
            if !crate::database::ai_accounts::exists(conn, account_id)? {
                return Err(AppError::Validation(
                    "The selected AI connection no longer exists.".into(),
                ));
            }
            Some(account_id)
        }
        Some(None) => None,
        None => existing.ai_account_id,
    };
    let ai_major_commit_messages_enabled = input
        .ai_major_commit_messages_enabled
        .unwrap_or(existing.ai_major_commit_messages_enabled);
    let ai_fast_commit_messages_enabled = input
        .ai_fast_commit_messages_enabled
        .unwrap_or(existing.ai_fast_commit_messages_enabled);
    if (ai_major_commit_messages_enabled || ai_fast_commit_messages_enabled)
        && ai_account_id.is_none()
    {
        return Err(AppError::Validation(
            "Choose an AI connection before enabling AI commit messages.".into(),
        ));
    }

    conn.execute(
        "UPDATE backup_settings SET backup_time = ?1, backup_on_startup = ?2, \
             autostart_enabled = ?3, notifications_enabled = ?4, \
             continuous_backup_enabled = ?5, change_debounce_seconds = ?6, \
             ai_account_id = ?7, ai_major_commit_messages_enabled = ?8, \
             ai_fast_commit_messages_enabled = ?9 \
         WHERE profile_id = ?10",
        params![
            backup_time,
            backup_on_startup,
            autostart_enabled,
            notifications_enabled,
            continuous_backup_enabled,
            change_debounce_seconds,
            ai_account_id,
            ai_major_commit_messages_enabled,
            ai_fast_commit_messages_enabled,
            profile_id,
        ],
    )?;
    get(conn, profile_id)
}

/// Relative managed-workspace path of the snapshot matching the confirmed
/// `file_snapshots` rows. It never contains a user filesystem path.
pub fn last_snapshot_path(conn: &Connection, profile_id: i64) -> AppResult<Option<String>> {
    conn.query_row(
        "SELECT last_snapshot_path FROM backup_settings WHERE profile_id = ?1",
        params![profile_id],
        |row| row.get(0),
    )
    .map_err(Into::into)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::{ai_accounts, profiles, Database};
    use crate::models::{AiProvider, CreateBackupProfileInput, UpdateBackupSettingsInput};

    fn profile_id(db: &Database) -> i64 {
        db.with(|conn| {
            profiles::create(
                conn,
                &CreateBackupProfileInput {
                    name: "Documents".into(),
                    repository_owner: None,
                    repository_name: None,
                    repository_url: None,
                    branch: None,
                    integration_account_id: None,
                },
            )
            .map(|profile| profile.id)
        })
        .unwrap()
    }

    #[test]
    fn continuous_backup_defaults_and_debounce_are_validated() {
        let db = Database::open_in_memory().unwrap();
        let id = profile_id(&db);
        let defaults = db.with(|conn| get(conn, id)).unwrap();
        assert!(!defaults.continuous_backup_enabled);
        assert_eq!(defaults.change_debounce_seconds, 10);
        assert_eq!(defaults.ai_account_id, None);
        assert!(!defaults.ai_major_commit_messages_enabled);
        assert!(!defaults.ai_fast_commit_messages_enabled);

        let updated = db
            .with(|conn| {
                update(
                    conn,
                    id,
                    &UpdateBackupSettingsInput {
                        continuous_backup_enabled: Some(true),
                        change_debounce_seconds: Some(30),
                        ..Default::default()
                    },
                )
            })
            .unwrap();
        assert!(updated.continuous_backup_enabled);
        assert_eq!(updated.change_debounce_seconds, 30);

        let invalid = db.with(|conn| {
            update(
                conn,
                id,
                &UpdateBackupSettingsInput {
                    change_debounce_seconds: Some(2),
                    ..Default::default()
                },
            )
        });
        assert!(matches!(invalid, Err(AppError::Validation(_))));
    }

    #[test]
    fn ai_commit_settings_require_an_existing_connection() {
        let db = Database::open_in_memory().unwrap();
        let id = profile_id(&db);
        let account = db
            .with(|conn| {
                ai_accounts::insert(
                    conn,
                    AiProvider::Ollama,
                    "Local",
                    "http://127.0.0.1:11434",
                    "qwen3:4b",
                )
            })
            .unwrap();
        let updated = db
            .with(|conn| {
                update(
                    conn,
                    id,
                    &UpdateBackupSettingsInput {
                        ai_account_id: Some(Some(account.id)),
                        ai_major_commit_messages_enabled: Some(true),
                        ai_fast_commit_messages_enabled: Some(true),
                        ..Default::default()
                    },
                )
            })
            .unwrap();
        assert_eq!(updated.ai_account_id, Some(account.id));
        assert!(updated.ai_major_commit_messages_enabled);
        assert!(updated.ai_fast_commit_messages_enabled);

        let invalid = db.with(|conn| {
            update(
                conn,
                id,
                &UpdateBackupSettingsInput {
                    ai_account_id: Some(Some(99_999)),
                    ..Default::default()
                },
            )
        });
        assert!(matches!(invalid, Err(AppError::Validation(_))));
    }
}
