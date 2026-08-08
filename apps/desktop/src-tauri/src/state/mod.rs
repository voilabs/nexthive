//! Shared application state managed by Tauri and injected into commands.

use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use crate::database::Database;
use crate::errors::{AppError, AppResult};

pub struct AppState {
    pub db: Database,
    /// Profiles with a backup currently in flight — enforces the
    /// one-backup-per-profile rule.
    running_backups: Mutex<HashSet<i64>>,
    running_automatic_syncs: Mutex<HashSet<i64>>,
    database_maintenance: AtomicBool,
    quitting: AtomicBool,
}

impl AppState {
    pub fn new(db: Database) -> Self {
        Self {
            db,
            running_backups: Mutex::new(HashSet::new()),
            running_automatic_syncs: Mutex::new(HashSet::new()),
            database_maintenance: AtomicBool::new(false),
            quitting: AtomicBool::new(false),
        }
    }

    /// Mark a profile's backup as running; the returned guard releases the
    /// slot on drop (including on panic/error paths).
    pub fn try_start_backup(&self, profile_id: i64) -> AppResult<BackupSlot<'_>> {
        if self.database_maintenance.load(Ordering::SeqCst) {
            return Err(AppError::Validation(
                "Database maintenance is running. Try the backup again when it finishes.".into(),
            ));
        }
        let mut running = self
            .running_backups
            .lock()
            .map_err(|_| AppError::internal("backup lock poisoned"))?;
        if !running.insert(profile_id) {
            return Err(AppError::Validation(
                "A backup for this profile is already running.".into(),
            ));
        }
        Ok(BackupSlot {
            running: &self.running_backups,
            profile_id,
        })
    }

    pub fn is_backup_running(&self, profile_id: i64) -> bool {
        self.running_backups
            .lock()
            .map(|running| running.contains(&profile_id))
            .unwrap_or(false)
    }

    pub fn try_start_automatic_sync(&self, rule_id: i64) -> AppResult<AutomaticSyncSlot<'_>> {
        if self.database_maintenance.load(Ordering::SeqCst) {
            return Err(AppError::Validation(
                "Database maintenance is running. Automatic profile checks will resume shortly."
                    .into(),
            ));
        }
        let mut running = self
            .running_automatic_syncs
            .lock()
            .map_err(|_| AppError::internal("automatic profile lock poisoned"))?;
        if !running.insert(rule_id) {
            return Err(AppError::Validation(
                "This automatic profile is already checking its folder.".into(),
            ));
        }
        Ok(AutomaticSyncSlot {
            running: &self.running_automatic_syncs,
            rule_id,
        })
    }

    pub fn has_active_storage_operations(&self) -> bool {
        let backups_active = self
            .running_backups
            .lock()
            .map(|running| !running.is_empty())
            .unwrap_or(true);
        let automatic_syncs_active = self
            .running_automatic_syncs
            .lock()
            .map(|running| !running.is_empty())
            .unwrap_or(true);
        backups_active || automatic_syncs_active
    }

    pub fn try_start_database_maintenance(&self) -> AppResult<DatabaseMaintenanceSlot<'_>> {
        self.database_maintenance
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .map_err(|_| AppError::Validation("Database maintenance is already running.".into()))?;
        if self.has_active_storage_operations() {
            self.database_maintenance.store(false, Ordering::SeqCst);
            return Err(AppError::Validation(
                "Wait for active backups to finish before repairing the database.".into(),
            ));
        }
        Ok(DatabaseMaintenanceSlot {
            active: &self.database_maintenance,
        })
    }

    pub fn request_quit(&self) {
        self.quitting.store(true, Ordering::SeqCst);
    }

    pub fn is_quitting(&self) -> bool {
        self.quitting.load(Ordering::SeqCst)
    }
}

pub struct BackupSlot<'a> {
    running: &'a Mutex<HashSet<i64>>,
    profile_id: i64,
}

impl Drop for BackupSlot<'_> {
    fn drop(&mut self) {
        if let Ok(mut running) = self.running.lock() {
            running.remove(&self.profile_id);
        }
    }
}

pub struct AutomaticSyncSlot<'a> {
    running: &'a Mutex<HashSet<i64>>,
    rule_id: i64,
}

impl Drop for AutomaticSyncSlot<'_> {
    fn drop(&mut self) {
        if let Ok(mut running) = self.running.lock() {
            running.remove(&self.rule_id);
        }
    }
}

pub struct DatabaseMaintenanceSlot<'a> {
    active: &'a AtomicBool,
}

impl Drop for DatabaseMaintenanceSlot<'_> {
    fn drop(&mut self) {
        self.active.store(false, Ordering::SeqCst);
    }
}
