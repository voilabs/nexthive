use tauri::{AppHandle, Manager, State};

use crate::database::integration_accounts;
use crate::errors::AppResult;
use crate::integrations::{accounts, repositories};
use crate::models::{
    AddTokenAccountResult, ConnectionTestResult, GitProvider, IntegrationAccount, RepositorySummary,
};
use crate::state::AppState;

#[tauri::command]
pub fn list_integration_accounts(state: State<'_, AppState>) -> AppResult<Vec<IntegrationAccount>> {
    state.db.with(|conn| integration_accounts::list(conn))
}

/// The token crosses IPC once and is immediately handed to Rust's
/// provider client and OS credential store. It is never returned.
#[tauri::command]
pub async fn add_integration_token_account(
    app: AppHandle,
    provider: GitProvider,
    label: String,
    base_url: Option<String>,
    token: String,
) -> AppResult<AddTokenAccountResult> {
    accounts::add_token_account(&app, provider, label, base_url, token).await
}

#[tauri::command]
pub async fn add_integration_ssh_account(
    app: AppHandle,
    provider: GitProvider,
    label: String,
) -> AppResult<IntegrationAccount> {
    accounts::add_ssh_account(&app, provider, label).await
}

#[tauri::command]
pub async fn test_integration_connection(
    app: AppHandle,
    id: i64,
) -> AppResult<ConnectionTestResult> {
    accounts::test_connection(&app, id).await
}

#[tauri::command]
pub async fn remove_integration_account(app: AppHandle, id: i64) -> AppResult<()> {
    accounts::remove_account(&app, id).await
}

#[tauri::command]
pub async fn list_integration_repositories(
    app: AppHandle,
    account_id: i64,
) -> AppResult<Vec<RepositorySummary>> {
    repositories::list_for_account(&app, account_id).await
}

#[tauri::command]
pub fn get_integration_ssh_public_key(app: AppHandle, id: i64) -> AppResult<Option<String>> {
    let state = app.state::<AppState>();
    let account = state.db.with(|conn| integration_accounts::get(conn, id))?;
    Ok(account.ssh_public_key)
}
