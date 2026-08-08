use tauri::{AppHandle, Manager, State};

use crate::automatic_profiles;
use crate::database::automatic_profiles as repository;
use crate::errors::AppResult;
use crate::models::{
    AutomaticProfileRule, AutomaticProfileSyncResult, SaveAutomaticProfileRuleInput,
};
use crate::state::AppState;

#[tauri::command]
pub fn list_automatic_profile_rules(
    state: State<'_, AppState>,
) -> AppResult<Vec<AutomaticProfileRule>> {
    state.db.with(|conn| repository::list(conn))
}

#[tauri::command]
pub async fn create_automatic_profile_rule(
    app: AppHandle,
    input: SaveAutomaticProfileRuleInput,
) -> AppResult<AutomaticProfileSyncResult> {
    let id = automatic_profiles::save_rule(&app, None, input)?;
    automatic_profiles::reconcile_rule(app, id).await
}

#[tauri::command]
pub async fn update_automatic_profile_rule(
    app: AppHandle,
    id: i64,
    input: SaveAutomaticProfileRuleInput,
) -> AppResult<AutomaticProfileRule> {
    automatic_profiles::save_rule(&app, Some(id), input)?;
    let state = app.state::<AppState>();
    let enabled = state.db.with(|conn| repository::get(conn, id))?.enabled;
    if enabled {
        return automatic_profiles::reconcile_rule(app, id)
            .await
            .map(|result| result.rule);
    }
    state.db.with(|conn| repository::get(conn, id))
}

#[tauri::command]
pub async fn sync_automatic_profile_rule(
    app: AppHandle,
    id: i64,
) -> AppResult<AutomaticProfileSyncResult> {
    automatic_profiles::reconcile_rule(app, id).await
}

#[tauri::command]
pub fn delete_automatic_profile_rule(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    state.db.with(|conn| repository::delete(conn, id))
}
