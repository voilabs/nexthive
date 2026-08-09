//! SQLite persistence layer.
//!
//! A single connection guarded by a mutex is sufficient for this app's
//! write patterns; WAL mode keeps reads cheap. All schema changes go
//! through versioned migrations — tables are never recreated at startup.

pub mod ai_accounts;
pub mod app_settings;
pub mod automatic_profiles;
pub mod excludes;
pub mod health;
pub mod integration_accounts;
pub mod migrations;
pub mod profiles;
pub mod runs;
pub mod s3_accounts;
pub mod settings;
pub mod snapshots;
pub mod sources;

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use rusqlite::Connection;

use crate::errors::{AppError, AppResult};
use crate::models::{DatabaseHealthReport, DatabaseRepairResult};

pub const DB_FILE_NAME: &str = "nexthive.db";

pub struct Database {
    conn: Mutex<Connection>,
    path: Option<PathBuf>,
}

impl Database {
    /// Open (creating if necessary) the database at `path` and bring the
    /// schema up to date.
    pub fn open(path: &Path) -> AppResult<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let mut conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        let current_version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
        if current_version > 0 && current_version < migrations::latest_version() {
            let backup = health::create_safety_backup(&conn, path)?;
            log::info!(
                "created pre-migration database backup for v{current_version} -> v{} at {}",
                migrations::latest_version(),
                backup.display()
            );
        }
        migrations::run(&mut conn)?;
        if let Some(result) = health::automatically_repair_schema_drift(&mut conn, path)? {
            log::warn!(
                "automatically repaired database schema drift; safety backup: {}",
                result.backup_path
            );
        }
        let report = health::inspect(&conn, Some(path))?;
        if report.status != crate::models::DatabaseHealthStatus::Healthy {
            log::warn!("database health check needs attention: {report:?}");
        }
        Ok(Self {
            conn: Mutex::new(conn),
            path: Some(path.to_path_buf()),
        })
    }

    /// Open an in-memory database (used by tests).
    #[cfg(test)]
    pub fn open_in_memory() -> AppResult<Self> {
        let mut conn = Connection::open_in_memory()?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        migrations::run(&mut conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
            path: None,
        })
    }

    /// Run `f` with exclusive access to the connection.
    pub fn with<T>(&self, f: impl FnOnce(&mut Connection) -> AppResult<T>) -> AppResult<T> {
        let mut conn = self
            .conn
            .lock()
            .map_err(|_| AppError::internal("database mutex poisoned"))?;
        f(&mut conn)
    }

    pub fn health(&self) -> AppResult<DatabaseHealthReport> {
        self.with(|conn| health::inspect(conn, self.path.as_deref()))
    }

    pub fn repair(&self) -> AppResult<DatabaseRepairResult> {
        let path = self.path.as_deref().ok_or_else(|| {
            AppError::internal("in-memory database cannot create a safety backup")
        })?;
        self.with(|conn| health::repair(conn, path))
    }
}
