use tauri::{AppHandle, Manager};

use crate::errors::{AppError, AppResult};
use crate::models::{DatabaseHealthReport, DatabaseRepairResult};
use crate::state::AppState;

#[tauri::command]
pub async fn get_database_health(app: AppHandle) -> AppResult<DatabaseHealthReport> {
    tauri::async_runtime::spawn_blocking(move || app.state::<AppState>().db.health())
        .await
        .map_err(|error| AppError::internal(format!("database health task panicked: {error}")))?
}

#[tauri::command]
pub async fn repair_database(app: AppHandle) -> AppResult<DatabaseRepairResult> {
    let state = app.state::<AppState>();
    let _maintenance = state.try_start_database_maintenance()?;
    let worker_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || worker_app.state::<AppState>().db.repair())
        .await
        .map_err(|error| AppError::internal(format!("database repair task panicked: {error}")))?
}
