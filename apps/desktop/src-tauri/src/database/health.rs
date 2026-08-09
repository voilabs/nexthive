//! SQLite health checks and conservative repair operations.
//!
//! Repairs never reset user data. A consistent online backup is written
//! before any schema or index mutation is attempted.

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use chrono::Utc;
use rusqlite::{params, Connection, DatabaseName};

use crate::database::migrations;
use crate::errors::{AppError, AppResult};
use crate::models::{DatabaseHealthReport, DatabaseHealthStatus, DatabaseRepairResult};

const REQUIRED_SCHEMA: &[(&str, &[&str])] = &[
    (
        "backup_profiles",
        &[
            "id",
            "name",
            "branch",
            "enabled",
            "integration_account_id",
            "automatic_profile_rule_id",
            "target_type",
            "s3_account_id",
            "s3_prefix",
            "archived_at",
            "created_at",
            "updated_at",
        ],
    ),
    (
        "backup_sources",
        &[
            "id",
            "profile_id",
            "path",
            "enabled",
            "exclude_profile_id",
            "scan_mode",
            "created_at",
        ],
    ),
    (
        "file_snapshots",
        &["id", "source_id", "relative_path", "hash", "size"],
    ),
    (
        "backup_runs",
        &["id", "profile_id", "status", "started_at", "completed_at"],
    ),
    (
        "backup_settings",
        &[
            "profile_id",
            "backup_time",
            "continuous_backup_enabled",
            "change_debounce_seconds",
            "ai_account_id",
        ],
    ),
    (
        "app_settings",
        &["id", "theme", "language", "time_zone", "updated_at"],
    ),
    (
        "integration_accounts",
        &["id", "provider", "auth_method", "base_url"],
    ),
    (
        "s3_accounts",
        &["id", "label", "endpoint", "region", "bucket", "path_style"],
    ),
    ("exclude_profiles", &["id", "name", "updated_at"]),
    (
        "exclude_rules",
        &["id", "exclude_profile_id", "pattern", "rule_kind"],
    ),
    (
        "ai_provider_accounts",
        &["id", "provider", "label", "base_url", "model"],
    ),
    (
        "automatic_profile_rules",
        &[
            "id",
            "name",
            "root_path",
            "enabled",
            "target_type",
            "s3_account_id",
            "s3_prefix",
            "updated_at",
        ],
    ),
    (
        "automatic_profile_members",
        &[
            "id",
            "rule_id",
            "entry_key",
            "entry_kind",
            "profile_id",
            "source_id",
            "status",
        ],
    ),
];

const REPAIRABLE_ITEMS: &[&str] = &[
    "automatic_profile_members.source_id",
    "backup_profiles.automatic_profile_rule_id",
    "backup_profiles.archived_at",
];

fn table_exists(conn: &Connection, table: &str) -> AppResult<bool> {
    Ok(conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = ?1)",
        params![table],
        |row| row.get(0),
    )?)
}

fn table_columns(conn: &Connection, table: &str) -> AppResult<HashSet<String>> {
    // Table names come exclusively from REQUIRED_SCHEMA, never user input.
    let mut stmt = conn.prepare(&format!("PRAGMA table_info(\"{table}\")"))?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(1))?;
    Ok(rows.collect::<Result<HashSet<_>, _>>()?)
}

fn missing_schema_items(conn: &Connection) -> AppResult<Vec<String>> {
    let mut missing = Vec::new();
    for (table, required_columns) in REQUIRED_SCHEMA {
        if !table_exists(conn, table)? {
            missing.push(format!("table:{table}"));
            continue;
        }
        let columns = table_columns(conn, table)?;
        for column in *required_columns {
            if !columns.contains(*column) {
                missing.push(format!("{table}.{column}"));
            }
        }
    }
    Ok(missing)
}

fn integrity_is_ok(conn: &Connection) -> AppResult<bool> {
    let mut stmt = conn.prepare("PRAGMA quick_check")?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
    for row in rows {
        if row?.to_ascii_lowercase() != "ok" {
            return Ok(false);
        }
    }
    Ok(true)
}

fn foreign_key_violation_count(conn: &Connection) -> AppResult<usize> {
    let mut stmt = conn.prepare("PRAGMA foreign_key_check")?;
    let mut rows = stmt.query([])?;
    let mut count = 0usize;
    while rows.next()?.is_some() {
        count = count.saturating_add(1);
    }
    Ok(count)
}

fn database_size(path: Option<&Path>) -> u64 {
    let Some(path) = path else {
        return 0;
    };
    let main = std::fs::metadata(path)
        .map(|metadata| metadata.len())
        .unwrap_or(0);
    let wal_path = PathBuf::from(format!("{}-wal", path.to_string_lossy()));
    main.saturating_add(
        std::fs::metadata(wal_path)
            .map(|metadata| metadata.len())
            .unwrap_or(0),
    )
}

pub fn inspect(conn: &Connection, path: Option<&Path>) -> AppResult<DatabaseHealthReport> {
    let schema_version = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    let integrity_ok = integrity_is_ok(conn)?;
    let foreign_key_violations = foreign_key_violation_count(conn)?;
    let missing_schema_items = missing_schema_items(conn)?;
    let schema_repairable = missing_schema_items
        .iter()
        .all(|item| REPAIRABLE_ITEMS.contains(&item.as_str()));
    let status = if !integrity_ok {
        DatabaseHealthStatus::Corrupt
    } else if schema_version != migrations::latest_version()
        || foreign_key_violations > 0
        || !missing_schema_items.is_empty()
    {
        DatabaseHealthStatus::NeedsRepair
    } else {
        DatabaseHealthStatus::Healthy
    };
    let repair_available = integrity_ok && schema_repairable && foreign_key_violations == 0;
    let message = match status {
        DatabaseHealthStatus::Healthy => "The local database is healthy.".into(),
        DatabaseHealthStatus::NeedsRepair if repair_available => {
            "The local database schema is incomplete and can be repaired safely.".into()
        }
        DatabaseHealthStatus::NeedsRepair => {
            "The local database needs attention. A safety backup can be created before maintenance."
                .into()
        }
        DatabaseHealthStatus::Corrupt => {
            "SQLite reported integrity damage. NextHive will not reset or discard the database automatically."
                .into()
        }
    };
    Ok(DatabaseHealthReport {
        status,
        schema_version,
        expected_schema_version: migrations::latest_version(),
        integrity_ok,
        foreign_key_violations,
        missing_schema_items,
        database_size: database_size(path),
        repair_available,
        message,
        checked_at: Utc::now(),
    })
}

fn backup_path(database_path: &Path) -> AppResult<PathBuf> {
    let parent = database_path
        .parent()
        .ok_or_else(|| AppError::internal("database path has no parent directory"))?;
    let backup_dir = parent.join("database-backups");
    std::fs::create_dir_all(&backup_dir)?;
    Ok(backup_dir.join(format!(
        "nexthive-{}.db",
        Utc::now().format("%Y%m%d-%H%M%S-%3f")
    )))
}

pub fn create_safety_backup(conn: &Connection, database_path: &Path) -> AppResult<PathBuf> {
    let destination = backup_path(database_path)?;
    conn.backup(DatabaseName::Main, &destination, None)?;
    log::info!(
        "created database safety backup at {}",
        destination.display()
    );
    Ok(destination)
}

fn repair_known_schema_drift(conn: &Connection, repairs: &mut Vec<String>) -> AppResult<()> {
    if table_exists(conn, "automatic_profile_members")?
        && !table_columns(conn, "automatic_profile_members")?.contains("source_id")
    {
        conn.execute_batch(
            "ALTER TABLE automatic_profile_members \
                 ADD COLUMN source_id INTEGER REFERENCES backup_sources(id) ON DELETE SET NULL; \
             CREATE INDEX IF NOT EXISTS idx_automatic_profile_members_source \
                 ON automatic_profile_members(source_id);",
        )?;
        repairs.push("Restored the automatic-profile source link.".into());
    }
    if table_exists(conn, "backup_profiles")?
        && table_exists(conn, "automatic_profile_rules")?
        && table_exists(conn, "automatic_profile_members")?
        && !table_columns(conn, "backup_profiles")?.contains("automatic_profile_rule_id")
    {
        conn.execute_batch(
            "ALTER TABLE backup_profiles \
                 ADD COLUMN automatic_profile_rule_id INTEGER \
                     REFERENCES automatic_profile_rules(id) ON DELETE SET NULL; \
             UPDATE backup_profiles \
             SET automatic_profile_rule_id = (\
                 SELECT member.rule_id FROM automatic_profile_members AS member \
                 WHERE member.profile_id = backup_profiles.id \
                 ORDER BY member.id LIMIT 1\
             ) \
             WHERE EXISTS (\
                 SELECT 1 FROM automatic_profile_members AS member \
                 WHERE member.profile_id = backup_profiles.id\
             ); \
             CREATE INDEX IF NOT EXISTS idx_backup_profiles_automatic_rule \
                 ON backup_profiles(automatic_profile_rule_id);",
        )?;
        repairs.push("Restored automatic-profile ownership links.".into());
    }
    if table_exists(conn, "backup_profiles")?
        && !table_columns(conn, "backup_profiles")?.contains("archived_at")
    {
        conn.execute_batch(
            "ALTER TABLE backup_profiles ADD COLUMN archived_at TEXT; \
             CREATE INDEX IF NOT EXISTS idx_backup_profiles_archived \
                 ON backup_profiles(archived_at, enabled, id);",
        )?;
        repairs.push("Restored recoverable profile retirement support.".into());
    }
    Ok(())
}

pub fn repair(conn: &mut Connection, database_path: &Path) -> AppResult<DatabaseRepairResult> {
    let before = inspect(conn, Some(database_path))?;
    let backup = create_safety_backup(conn, database_path)?;
    let mut repairs_applied = Vec::new();

    if before.status == DatabaseHealthStatus::Corrupt || !before.repair_available {
        repairs_applied
            .push("Created a safety backup; no destructive automatic repair was attempted.".into());
        let after = inspect(conn, Some(database_path))?;
        return Ok(DatabaseRepairResult {
            before,
            after,
            backup_path: backup.display().to_string(),
            repairs_applied,
        });
    }

    migrations::run(conn)?;
    repair_known_schema_drift(conn, &mut repairs_applied)?;
    let seeded_settings = conn.execute(
        "INSERT OR IGNORE INTO backup_settings (profile_id) \
         SELECT id FROM backup_profiles",
        [],
    )?;
    if seeded_settings > 0 {
        repairs_applied.push(format!(
            "Restored settings for {seeded_settings} backup profile(s)."
        ));
    }
    conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_backup_sources_profile \
             ON backup_sources(profile_id); \
         CREATE INDEX IF NOT EXISTS idx_file_snapshots_source \
             ON file_snapshots(source_id); \
         CREATE INDEX IF NOT EXISTS idx_backup_runs_profile \
             ON backup_runs(profile_id, started_at DESC); \
         CREATE INDEX IF NOT EXISTS idx_automatic_profile_members_source \
             ON automatic_profile_members(source_id); \
         CREATE INDEX IF NOT EXISTS idx_backup_profiles_automatic_rule \
             ON backup_profiles(automatic_profile_rule_id); \
         CREATE INDEX IF NOT EXISTS idx_backup_profiles_archived \
             ON backup_profiles(archived_at, enabled, id); \
         REINDEX; \
         PRAGMA optimize;",
    )?;
    repairs_applied.push("Rebuilt and optimized database indexes.".into());

    let after = inspect(conn, Some(database_path))?;
    Ok(DatabaseRepairResult {
        before,
        after,
        backup_path: backup.display().to_string(),
        repairs_applied,
    })
}

pub fn automatically_repair_schema_drift(
    conn: &mut Connection,
    database_path: &Path,
) -> AppResult<Option<DatabaseRepairResult>> {
    let report = inspect(conn, Some(database_path))?;
    if report.status == DatabaseHealthStatus::NeedsRepair
        && report.repair_available
        && !report.missing_schema_items.is_empty()
    {
        return repair(conn, database_path).map(Some);
    }
    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;

    #[test]
    fn fresh_database_passes_health_check() {
        let db = Database::open_in_memory().unwrap();
        let report = db.health().unwrap();
        assert_eq!(report.status, DatabaseHealthStatus::Healthy);
        assert!(report.integrity_ok);
        assert!(report.missing_schema_items.is_empty());
    }
}
