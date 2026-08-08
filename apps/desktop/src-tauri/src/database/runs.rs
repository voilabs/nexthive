//! Repository functions for backup run records.

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::errors::{AppError, AppResult};
use crate::models::{BackupRun, BackupRunStatus};

const COLUMNS: &str = "id, profile_id, started_at, completed_at, status, files_added, \
     files_modified, files_deleted, bytes_processed, commit_sha, error_message";

fn row_to_run(row: &Row) -> rusqlite::Result<BackupRun> {
    let status_text: String = row.get("status")?;
    let status = BackupRunStatus::parse(&status_text).ok_or_else(|| {
        rusqlite::Error::FromSqlConversionFailure(
            4,
            rusqlite::types::Type::Text,
            format!("unknown run status: {status_text}").into(),
        )
    })?;
    Ok(BackupRun {
        id: row.get("id")?,
        profile_id: row.get("profile_id")?,
        started_at: row.get::<_, DateTime<Utc>>("started_at")?,
        completed_at: row.get::<_, Option<DateTime<Utc>>>("completed_at")?,
        status,
        files_added: row.get("files_added")?,
        files_modified: row.get("files_modified")?,
        files_deleted: row.get("files_deleted")?,
        bytes_processed: row.get("bytes_processed")?,
        commit_sha: row.get("commit_sha")?,
        error_message: row.get("error_message")?,
    })
}

pub fn get(conn: &Connection, id: i64) -> AppResult<BackupRun> {
    conn.query_row(
        &format!("SELECT {COLUMNS} FROM backup_runs WHERE id = ?1"),
        params![id],
        row_to_run,
    )
    .map_err(AppError::from)
}

pub fn insert_running(conn: &Connection, profile_id: i64) -> AppResult<BackupRun> {
    conn.execute(
        "INSERT INTO backup_runs (profile_id, started_at, status) VALUES (?1, ?2, 'running')",
        params![profile_id, Utc::now()],
    )?;
    get(conn, conn.last_insert_rowid())
}

#[allow(clippy::too_many_arguments)]
pub fn complete_success(
    conn: &Connection,
    id: i64,
    files_added: i64,
    files_modified: i64,
    files_deleted: i64,
    bytes_processed: i64,
    commit_sha: Option<&str>,
) -> AppResult<BackupRun> {
    conn.execute(
        "UPDATE backup_runs SET completed_at = ?1, status = 'success', files_added = ?2, \
             files_modified = ?3, files_deleted = ?4, bytes_processed = ?5, commit_sha = ?6 \
         WHERE id = ?7",
        params![
            Utc::now(),
            files_added,
            files_modified,
            files_deleted,
            bytes_processed,
            commit_sha,
            id,
        ],
    )?;
    get(conn, id)
}

pub fn complete_failed(conn: &Connection, id: i64, message: &str) -> AppResult<BackupRun> {
    conn.execute(
        "UPDATE backup_runs SET completed_at = ?1, status = 'failed', error_message = ?2 \
         WHERE id = ?3",
        params![Utc::now(), message, id],
    )?;
    get(conn, id)
}

pub fn list(conn: &Connection, profile_id: Option<i64>, limit: u32) -> AppResult<Vec<BackupRun>> {
    let limit = limit.clamp(1, 500) as i64;
    let mut runs = Vec::new();
    match profile_id {
        Some(profile_id) => {
            let mut stmt = conn.prepare(&format!(
                "SELECT {COLUMNS} FROM backup_runs WHERE profile_id = ?1 \
                 ORDER BY started_at DESC, id DESC LIMIT ?2"
            ))?;
            let rows = stmt.query_map(params![profile_id, limit], row_to_run)?;
            for row in rows {
                runs.push(row?);
            }
        }
        None => {
            let mut stmt = conn.prepare(&format!(
                "SELECT {COLUMNS} FROM backup_runs \
                 WHERE EXISTS (SELECT 1 FROM backup_profiles AS profile \
                     WHERE profile.id = backup_runs.profile_id \
                       AND profile.archived_at IS NULL) \
                 ORDER BY backup_runs.started_at DESC, backup_runs.id DESC LIMIT ?1"
            ))?;
            let rows = stmt.query_map(params![limit], row_to_run)?;
            for row in rows {
                runs.push(row?);
            }
        }
    }
    Ok(runs)
}

pub fn last_success(conn: &Connection, profile_id: i64) -> AppResult<Option<BackupRun>> {
    conn.query_row(
        &format!(
            "SELECT {COLUMNS} FROM backup_runs \
             WHERE profile_id = ?1 AND status = 'success' \
             ORDER BY completed_at DESC, id DESC LIMIT 1"
        ),
        params![profile_id],
        row_to_run,
    )
    .optional()
    .map_err(Into::into)
}

/// Any run left in `running` state from a previous process crash is marked
/// failed at startup so the UI never shows a phantom in-progress backup.
pub fn fail_stale_running(conn: &Connection) -> AppResult<()> {
    let changed = conn.execute(
        "UPDATE backup_runs SET status = 'failed', completed_at = ?1, \
             error_message = 'The application closed while this backup was running.' \
         WHERE status = 'running'",
        params![Utc::now()],
    )?;
    if changed > 0 {
        log::warn!("marked {changed} stale running backup(s) as failed");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::{profiles, Database};
    use crate::models::CreateBackupProfileInput;

    fn profile_input(name: &str) -> CreateBackupProfileInput {
        CreateBackupProfileInput {
            name: name.into(),
            repository_owner: None,
            repository_name: None,
            repository_url: None,
            branch: None,
            integration_account_id: None,
        }
    }

    #[test]
    fn global_history_hides_retired_profiles() {
        let db = Database::open_in_memory().unwrap();
        let visible = db
            .with(|conn| profiles::create(conn, &profile_input("Visible")))
            .unwrap();
        let retired = db
            .with(|conn| profiles::create(conn, &profile_input("Retired")))
            .unwrap();
        db.with(|conn| {
            insert_running(conn, visible.id)?;
            insert_running(conn, retired.id)?;
            conn.execute(
                "UPDATE backup_profiles SET enabled = 0, archived_at = ?1 WHERE id = ?2",
                params![Utc::now(), retired.id],
            )?;
            Ok(())
        })
        .unwrap();

        let history = db.with(|conn| list(conn, None, 20)).unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].profile_id, visible.id);
    }
}
