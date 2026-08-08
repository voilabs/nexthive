use tauri::{AppHandle, State};

use crate::database::profiles;
use crate::errors::AppResult;
use crate::integrations::repositories;
use crate::models::{BackupProfile, CreateBackupProfileInput, UpdateBackupProfileInput};
use crate::state::AppState;

#[tauri::command]
pub fn list_backup_profiles(state: State<'_, AppState>) -> AppResult<Vec<BackupProfile>> {
    state.db.with(|conn| profiles::list(conn))
}

#[tauri::command]
pub fn create_backup_profile(
    state: State<'_, AppState>,
    input: CreateBackupProfileInput,
) -> AppResult<BackupProfile> {
    state.db.with(|conn| profiles::create(conn, &input))
}

#[tauri::command]
pub fn update_backup_profile(
    state: State<'_, AppState>,
    id: i64,
    input: UpdateBackupProfileInput,
) -> AppResult<BackupProfile> {
    state.db.with(|conn| profiles::update(conn, id, &input))
}

#[tauri::command]
pub fn delete_backup_profile(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    state.db.with(|conn| profiles::delete(conn, id))
}

/// Create the `nexthive-<profile>` private repository on the linked
/// Git provider account and attach it to the profile.
#[tauri::command]
pub async fn create_profile_repository(app: AppHandle, id: i64) -> AppResult<BackupProfile> {
    repositories::create_for_profile(&app, id).await
}
