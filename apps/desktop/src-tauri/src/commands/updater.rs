use tauri::{ipc::Channel, AppHandle, State};

use crate::errors::AppResult;
use crate::models::AppUpdate;
use crate::updater::{self, UpdateProgressEvent, UpdateState};

#[tauri::command]
pub async fn check_for_app_update(
    app: AppHandle,
    state: State<'_, UpdateState>,
) -> AppResult<Option<AppUpdate>> {
    updater::check(&app, &state).await
}

#[tauri::command]
pub async fn install_app_update(
    app: AppHandle,
    state: State<'_, UpdateState>,
    on_event: Channel<UpdateProgressEvent>,
) -> AppResult<()> {
    updater::install(&app, &state, on_event).await
}
