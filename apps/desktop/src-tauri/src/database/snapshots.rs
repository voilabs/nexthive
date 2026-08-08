//! Repository functions for file snapshots — the confirmed backup state.
//!
//! Snapshots only advance after a successful push, so a failed backup
//! leaves the previous state intact and the next run re-detects the same
//! changes.

use std::collections::HashMap;

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};

use crate::errors::AppResult;

/// Stored state of one file, keyed by relative path within its source.
#[derive(Debug, Clone)]
pub struct SnapshotRecord {
    pub hash: String,
    pub size: i64,
    pub modified_at: DateTime<Utc>,
}

pub fn map_for_source(
    conn: &Connection,
    source_id: i64,
) -> AppResult<HashMap<String, SnapshotRecord>> {
    let mut stmt = conn.prepare(
        "SELECT relative_path, hash, size, modified_at FROM file_snapshots WHERE source_id = ?1",
    )?;
    let rows = stmt.query_map(params![source_id], |row| {
        Ok((
            row.get::<_, String>(0)?,
            SnapshotRecord {
                hash: row.get(1)?,
                size: row.get(2)?,
                modified_at: row.get::<_, DateTime<Utc>>(3)?,
            },
        ))
    })?;
    let mut map = HashMap::new();
    for row in rows {
        let (path, record) = row?;
        map.insert(path, record);
    }
    Ok(map)
}

/// One upsert entry produced by a completed backup.
pub struct SnapshotUpsert {
    pub source_id: i64,
    pub relative_path: String,
    pub hash: String,
    pub size: i64,
    pub modified_at: DateTime<Utc>,
}

/// Apply the confirmed state changes of a successful backup atomically.
pub fn apply_changes(
    conn: &mut Connection,
    upserts: &[SnapshotUpsert],
    deletes: &[(i64, String)],
) -> AppResult<()> {
    apply_confirmed_state(conn, upserts, deletes, None)
}

/// Atomically advance both file metadata and the managed snapshot path that
/// contains that exact confirmed state.
pub fn apply_changes_with_snapshot(
    conn: &mut Connection,
    profile_id: i64,
    snapshot_path: &str,
    upserts: &[SnapshotUpsert],
    deletes: &[(i64, String)],
) -> AppResult<()> {
    apply_confirmed_state(conn, upserts, deletes, Some((profile_id, snapshot_path)))
}

fn apply_confirmed_state(
    conn: &mut Connection,
    upserts: &[SnapshotUpsert],
    deletes: &[(i64, String)],
    snapshot: Option<(i64, &str)>,
) -> AppResult<()> {
    let now = Utc::now();
    let tx = conn.transaction()?;
    {
        let mut upsert_stmt = tx.prepare(
            "INSERT INTO file_snapshots \
                 (source_id, relative_path, hash, size, modified_at, last_seen_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6) \
             ON CONFLICT(source_id, relative_path) DO UPDATE SET \
                 hash = excluded.hash, size = excluded.size, \
                 modified_at = excluded.modified_at, last_seen_at = excluded.last_seen_at",
        )?;
        for upsert in upserts {
            upsert_stmt.execute(params![
                upsert.source_id,
                upsert.relative_path,
                upsert.hash,
                upsert.size,
                upsert.modified_at,
                now,
            ])?;
        }
        let mut delete_stmt =
            tx.prepare("DELETE FROM file_snapshots WHERE source_id = ?1 AND relative_path = ?2")?;
        for (source_id, relative_path) in deletes {
            delete_stmt.execute(params![source_id, relative_path])?;
        }
    }
    if let Some((profile_id, snapshot_path)) = snapshot {
        tx.execute(
            "UPDATE backup_settings SET last_snapshot_path = ?1 WHERE profile_id = ?2",
            params![snapshot_path, profile_id],
        )?;
    }
    tx.commit()?;
    Ok(())
}
