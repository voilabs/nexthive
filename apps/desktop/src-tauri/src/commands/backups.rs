use tauri::{AppHandle, State};

use crate::backup;
use crate::database::{runs, settings};
use crate::errors::AppResult;
use crate::models::{BackupRun, BackupSettings, UpdateBackupSettingsInput};
use crate::state::AppState;

#[tauri::command]
pub async fn run_manual_backup(app: AppHandle, profile_id: i64) -> AppResult<BackupRun> {
    backup::run(app, profile_id, "manual").await
}

#[tauri::command]
pub fn list_backup_runs(
    state: State<'_, AppState>,
    profile_id: Option<i64>,
    limit: Option<u32>,
) -> AppResult<Vec<BackupRun>> {
    state
        .db
        .with(|conn| runs::list(conn, profile_id, limit.unwrap_or(100)))
}

#[tauri::command]
pub fn get_backup_settings(
    state: State<'_, AppState>,
    profile_id: i64,
) -> AppResult<BackupSettings> {
    state.db.with(|conn| settings::get(conn, profile_id))
}

#[tauri::command]
pub fn update_backup_settings(
    state: State<'_, AppState>,
    profile_id: i64,
    input: UpdateBackupSettingsInput,
) -> AppResult<BackupSettings> {
    state
        .db
        .with(|conn| settings::update(conn, profile_id, &input))
}
