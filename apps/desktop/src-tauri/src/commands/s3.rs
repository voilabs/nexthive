use tauri::{AppHandle, Manager, State};

use crate::credentials::{s3_access_key_id, s3_secret_access_key, CredentialStore, KeyringStore};
use crate::database::s3_accounts;
use crate::errors::AppResult;
use crate::models::{ConnectionTestResult, CreateS3AccountInput, S3Account};
use crate::state::AppState;

#[tauri::command]
pub fn list_s3_accounts(state: State<'_, AppState>) -> AppResult<Vec<S3Account>> {
    state.db.with(|conn| s3_accounts::list(conn))
}

#[tauri::command]
pub fn add_s3_account(app: AppHandle, input: CreateS3AccountInput) -> AppResult<S3Account> {
    crate::s3_backup::add(&app, input)
}

#[tauri::command]
pub fn test_s3_connection(app: AppHandle, id: i64) -> AppResult<ConnectionTestResult> {
    let state = app.state::<AppState>();
    let account = state.db.with(|c| s3_accounts::get(c, id))?;
    crate::s3_backup::test_account(&account)?;
    Ok(ConnectionTestResult {
        success: true,
        message: format!("Connected to bucket {}.", account.bucket),
    })
}

#[tauri::command]
pub fn remove_s3_account(app: AppHandle, id: i64) -> AppResult<()> {
    let state = app.state::<AppState>();
    state.db.with(|c| s3_accounts::delete(c, id))?;
    KeyringStore.delete_secret(&s3_access_key_id(id))?;
    KeyringStore.delete_secret(&s3_secret_access_key(id))?;
    Ok(())
}
