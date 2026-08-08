//! Repository functions for backup source folders.

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::errors::{AppError, AppResult};
use crate::models::{BackupSource, SourceScanMode};

fn row_to_source(row: &Row) -> rusqlite::Result<BackupSource> {
    Ok(BackupSource {
        id: row.get("id")?,
        profile_id: row.get("profile_id")?,
        path: row.get("path")?,
        enabled: row.get::<_, i64>("enabled")? != 0,
        exclude_profile_id: row.get("exclude_profile_id")?,
        scan_mode: SourceScanMode::parse(row.get::<_, String>("scan_mode")?.as_str()).ok_or_else(
            || {
                rusqlite::Error::InvalidColumnType(
                    0,
                    "scan_mode".into(),
                    rusqlite::types::Type::Text,
                )
            },
        )?,
        created_at: row.get::<_, DateTime<Utc>>("created_at")?,
    })
}

pub fn list_all(conn: &Connection) -> AppResult<Vec<BackupSource>> {
    let mut stmt = conn.prepare(
        "SELECT source.id, source.profile_id, source.path, source.enabled, \
                source.exclude_profile_id, source.scan_mode, source.created_at \
         FROM backup_sources AS source \
         JOIN backup_profiles AS profile ON profile.id = source.profile_id \
         WHERE profile.archived_at IS NULL \
         ORDER BY source.profile_id, source.created_at, source.id",
    )?;
    let sources = stmt
        .query_map([], row_to_source)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(sources)
}

pub fn list_for_profile(conn: &Connection, profile_id: i64) -> AppResult<Vec<BackupSource>> {
    let mut stmt = conn.prepare(
        "SELECT id, profile_id, path, enabled, exclude_profile_id, scan_mode, created_at \
         FROM backup_sources WHERE profile_id = ?1 ORDER BY created_at, id",
    )?;
    let sources = stmt
        .query_map(params![profile_id], row_to_source)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(sources)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<BackupSource> {
    conn.query_row(
        "SELECT id, profile_id, path, enabled, exclude_profile_id, scan_mode, created_at \
         FROM backup_sources WHERE id = ?1",
        params![id],
        row_to_source,
    )
    .optional()?
    .ok_or(AppError::NotFound("Backup source"))
}

/// Insert a source folder. `canonical_path` must already be validated and
/// canonicalized (see `scanner::validate_source_path`); overlap with the
/// profile's existing sources is rejected here so the check and the insert
/// share one lock acquisition.
pub fn insert(
    conn: &Connection,
    profile_id: i64,
    canonical_path: &str,
    exclude_profile_id: Option<i64>,
) -> AppResult<BackupSource> {
    insert_with_mode(
        conn,
        profile_id,
        canonical_path,
        exclude_profile_id,
        SourceScanMode::Recursive,
    )
}

pub fn insert_with_mode(
    conn: &Connection,
    profile_id: i64,
    canonical_path: &str,
    exclude_profile_id: Option<i64>,
    scan_mode: SourceScanMode,
) -> AppResult<BackupSource> {
    if let Some(exclude_profile_id) = exclude_profile_id {
        if !crate::database::excludes::exists(conn, exclude_profile_id)? {
            return Err(AppError::NotFound("Exclude profile"));
        }
    }
    let existing = list_for_profile(conn, profile_id)?;
    for source in &existing {
        let existing_path = std::path::Path::new(&source.path);
        let new_path = std::path::Path::new(canonical_path);
        if new_path == existing_path {
            return Err(AppError::Validation(format!(
                "\"{canonical_path}\" is already part of this profile."
            )));
        }
        if new_path.starts_with(existing_path) {
            return Err(AppError::Validation(format!(
                "\"{canonical_path}\" is inside \"{}\", which is already backed up by this profile.",
                source.path
            )));
        }
        if existing_path.starts_with(new_path) {
            return Err(AppError::Validation(format!(
                "\"{canonical_path}\" contains \"{}\", which is already backed up by this profile. \
                 Remove the smaller folder first.",
                source.path
            )));
        }
    }

    conn.execute(
        "INSERT INTO backup_sources \
             (profile_id, path, enabled, exclude_profile_id, scan_mode, created_at) \
         VALUES (?1, ?2, 1, ?3, ?4, ?5)",
        params![
            profile_id,
            canonical_path,
            exclude_profile_id,
            scan_mode.as_str(),
            Utc::now()
        ],
    )?;
    let id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT id, profile_id, path, enabled, exclude_profile_id, scan_mode, created_at FROM backup_sources WHERE id = ?1",
        params![id],
        row_to_source,
    )
    .map_err(AppError::from)
}

/// Assign (or clear) the exclude profile used by a source.
pub fn set_exclude_profile(
    conn: &Connection,
    source_id: i64,
    exclude_profile_id: Option<i64>,
) -> AppResult<BackupSource> {
    if let Some(profile_id) = exclude_profile_id {
        if !crate::database::excludes::exists(conn, profile_id)? {
            return Err(AppError::NotFound("Exclude profile"));
        }
    }
    let changed = conn.execute(
        "UPDATE backup_sources SET exclude_profile_id = ?1 WHERE id = ?2",
        params![exclude_profile_id, source_id],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound("Backup source"));
    }
    conn.query_row(
        "SELECT id, profile_id, path, enabled, exclude_profile_id, scan_mode, created_at \
         FROM backup_sources WHERE id = ?1",
        params![source_id],
        row_to_source,
    )
    .map_err(AppError::from)
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    let changed = conn.execute("DELETE FROM backup_sources WHERE id = ?1", params![id])?;
    if changed == 0 {
        return Err(AppError::NotFound("Backup source"));
    }
    Ok(())
}

/// Update a source owned by an automatic-profile member. This is intentionally
/// not exposed as a general frontend command.
pub fn update_managed(
    conn: &Connection,
    id: i64,
    canonical_path: &str,
    exclude_profile_id: Option<i64>,
    scan_mode: SourceScanMode,
) -> AppResult<BackupSource> {
    if let Some(exclude_profile_id) = exclude_profile_id {
        if !crate::database::excludes::exists(conn, exclude_profile_id)? {
            return Err(AppError::NotFound("Exclude profile"));
        }
    }
    let changed = conn.execute(
        "UPDATE backup_sources SET path = ?1, exclude_profile_id = ?2, scan_mode = ?3, \
             enabled = 1 WHERE id = ?4",
        params![canonical_path, exclude_profile_id, scan_mode.as_str(), id],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound("Backup source"));
    }
    get(conn, id)
}
