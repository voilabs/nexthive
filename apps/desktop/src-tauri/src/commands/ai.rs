use tauri::{AppHandle, State};

use crate::ai::accounts;
use crate::database::ai_accounts;
use crate::errors::{AppError, AppResult};
use crate::models::{AiConnectionTestResult, AiProviderAccount, CreateAiProviderAccountInput};
use crate::state::AppState;

#[tauri::command]
pub fn list_ai_provider_accounts(state: State<'_, AppState>) -> AppResult<Vec<AiProviderAccount>> {
    state.db.with(|conn| ai_accounts::list(conn))
}

/// The optional API key crosses IPC once and is immediately used for the
/// validation probe and OS credential vault. It is never returned to React.
#[tauri::command]
pub async fn add_ai_provider_account(
    app: AppHandle,
    input: CreateAiProviderAccountInput,
) -> AppResult<AiProviderAccount> {
    tauri::async_runtime::spawn_blocking(move || accounts::create(&app, input))
        .await
        .map_err(|error| AppError::internal(format!("AI connection task panicked: {error}")))?
}

#[tauri::command]
pub async fn test_ai_provider_connection(
    app: AppHandle,
    id: i64,
) -> AppResult<AiConnectionTestResult> {
    tauri::async_runtime::spawn_blocking(move || accounts::test(&app, id))
        .await
        .map_err(|error| AppError::internal(format!("AI test task panicked: {error}")))?
}

#[tauri::command]
pub async fn remove_ai_provider_account(app: AppHandle, id: i64) -> AppResult<()> {
    tauri::async_runtime::spawn_blocking(move || accounts::remove(&app, id))
        .await
        .map_err(|error| AppError::internal(format!("AI removal task panicked: {error}")))?
}
