use tauri::State;

use crate::database::{profiles, sources};
use crate::errors::AppResult;
use crate::models::BackupSource;
use crate::scanner;
use crate::state::AppState;

#[tauri::command]
pub fn list_backup_sources(state: State<'_, AppState>) -> AppResult<Vec<BackupSource>> {
    state.db.with(|conn| sources::list_all(conn))
}

#[tauri::command]
pub fn add_backup_source(
    state: State<'_, AppState>,
    profile_id: i64,
    path: String,
    exclude_profile_id: Option<i64>,
) -> AppResult<BackupSource> {
    let canonical = scanner::validate_source_path(&path)?;
    let canonical = canonical.to_string_lossy().into_owned();
    state.db.with(|conn| {
        // Surface a clean not-found error if the profile is gone.
        profiles::get(conn, profile_id)?;
        sources::insert(conn, profile_id, &canonical, exclude_profile_id)
    })
}

#[tauri::command]
pub fn remove_backup_source(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    state.db.with(|conn| sources::delete(conn, id))
}
