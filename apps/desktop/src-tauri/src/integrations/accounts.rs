use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::credentials::{provider_token_key, ssh_keys, CredentialStore, KeyringStore};
use crate::database::integration_accounts as repo;
use crate::errors::{AppError, AppResult};
use crate::git;
use crate::integrations::provider_api;
use crate::models::{
    AddTokenAccountResult, ConnectionTestResult, GitProvider, IntegrationAccount,
    IntegrationAuthMethod,
};
use crate::state::AppState;

fn validate_label(label: &str) -> AppResult<&str> {
    let label = label.trim();
    if label.is_empty() {
        return Err(AppError::Validation(
            "Account label cannot be empty.".into(),
        ));
    }
    if label.chars().count() > 60 {
        return Err(AppError::Validation(
            "Account label is too long (maximum 60 characters).".into(),
        ));
    }
    Ok(label)
}

fn ssh_key_dir(app: &AppHandle) -> AppResult<PathBuf> {
    Ok(app.path().app_data_dir()?.join("ssh"))
}

pub fn ssh_private_key_path(app: &AppHandle, account_id: i64) -> AppResult<PathBuf> {
    Ok(ssh_key_dir(app)?.join(format!("account_{account_id}.pem")))
}

pub async fn add_token_account(
    app: &AppHandle,
    provider: GitProvider,
    label: String,
    base_url: Option<String>,
    token: String,
) -> AppResult<AddTokenAccountResult> {
    let label = validate_label(&label)?.to_owned();
    let token = token.trim();
    if token.is_empty() {
        return Err(AppError::Validation("Enter an access token.".into()));
    }
    let base_url = provider_api::normalize_base_url(provider, base_url.as_deref())?;
    let validation = provider_api::validate_token(provider, &base_url, token).await?;

    let state = app.state::<AppState>();
    let account = state.db.with(|conn| {
        repo::insert(
            conn,
            provider,
            &label,
            Some(&validation.username),
            IntegrationAuthMethod::Pat,
            &base_url,
            validation.avatar_url.as_deref(),
            None,
        )
    })?;

    if let Err(error) = KeyringStore.save_secret(&provider_token_key(provider, account.id), token) {
        let _ = state.db.with(|conn| repo::delete(conn, account.id));
        return Err(error);
    }

    Ok(AddTokenAccountResult {
        account,
        warning: validation.warning,
    })
}

pub async fn add_ssh_account(
    app: &AppHandle,
    provider: GitProvider,
    label: String,
) -> AppResult<IntegrationAccount> {
    if provider != GitProvider::GitHub {
        return Err(AppError::Validation(
            "Dedicated SSH keys are currently available for GitHub only. Use a token for this provider."
                .into(),
        ));
    }
    let label = validate_label(&label)?.to_owned();
    let comment = format!(
        "nexthive-{}",
        label
            .to_lowercase()
            .replace(|c: char| !c.is_alphanumeric(), "-")
    );
    let keypair =
        tauri::async_runtime::spawn_blocking(move || ssh_keys::generate_keypair(&comment))
            .await
            .map_err(|error| AppError::internal(format!("keygen task failed: {error}")))??;

    let state = app.state::<AppState>();
    let account = state.db.with(|conn| {
        repo::insert(
            conn,
            provider,
            &label,
            None,
            IntegrationAuthMethod::Ssh,
            "https://github.com",
            None,
            Some(&keypair.public_key_openssh),
        )
    })?;

    let key_path = ssh_private_key_path(app, account.id)?;
    let write_result = std::fs::create_dir_all(key_path.parent().expect("key path has parent"))
        .and_then(|_| std::fs::write(&key_path, keypair.private_key_pem.as_bytes()));
    if let Err(error) = write_result {
        let _ = state.db.with(|conn| repo::delete(conn, account.id));
        return Err(error.into());
    }
    Ok(account)
}

pub async fn test_connection(app: &AppHandle, id: i64) -> AppResult<ConnectionTestResult> {
    let state = app.state::<AppState>();
    let account = state.db.with(|conn| repo::get(conn, id))?;
    match account.auth_method {
        IntegrationAuthMethod::Pat => test_token(app, &account).await,
        IntegrationAuthMethod::Ssh => test_ssh(app, &account).await,
    }
}

async fn test_token(
    app: &AppHandle,
    account: &IntegrationAccount,
) -> AppResult<ConnectionTestResult> {
    let Some(token) = KeyringStore.get_secret(&provider_token_key(account.provider, account.id))?
    else {
        return Ok(ConnectionTestResult {
            success: false,
            message: "No token is stored for this account. Remove it and add it again.".into(),
        });
    };

    match provider_api::validate_token(account.provider, &account.base_url, &token).await {
        Ok(validation) => {
            app.state::<AppState>().db.with(|conn| {
                repo::update_identity(
                    conn,
                    account.id,
                    &validation.username,
                    validation.avatar_url.as_deref(),
                )
            })?;
            let mut message = format!(
                "Connected to {} as {}.",
                account.provider.display_name(),
                validation.username
            );
            if let Some(warning) = validation.warning {
                message.push(' ');
                message.push_str(&warning);
            }
            Ok(ConnectionTestResult {
                success: true,
                message,
            })
        }
        Err(AppError::GitHub(message) | AppError::Integration(message)) => {
            Ok(ConnectionTestResult {
                success: false,
                message,
            })
        }
        Err(AppError::Network(error)) => {
            log::warn!("provider connection test network failure: {error:?}");
            Ok(ConnectionTestResult {
                success: false,
                message: format!(
                    "Could not reach {}. Check the server address and your network connection.",
                    account.provider.display_name()
                ),
            })
        }
        Err(error) => Err(error),
    }
}

async fn test_ssh(
    app: &AppHandle,
    account: &IntegrationAccount,
) -> AppResult<ConnectionTestResult> {
    if account.provider != GitProvider::GitHub {
        return Ok(ConnectionTestResult {
            success: false,
            message: "SSH testing is not available for this provider yet.".into(),
        });
    }
    let key_path = ssh_private_key_path(app, account.id)?;
    if !key_path.is_file() {
        return Ok(ConnectionTestResult {
            success: false,
            message: "The private key file is missing. Remove the account and create it again."
                .into(),
        });
    }
    let outcome = tauri::async_runtime::spawn_blocking(move || git::probe_github_ssh(&key_path))
        .await
        .map_err(|error| AppError::internal(format!("ssh probe task failed: {error}")))?;
    Ok(ConnectionTestResult {
        success: outcome.success,
        message: outcome.message,
    })
}

pub async fn remove_account(app: &AppHandle, id: i64) -> AppResult<()> {
    let state = app.state::<AppState>();
    let account = state.db.with(|conn| repo::get(conn, id))?;
    KeyringStore.delete_secret(&provider_token_key(account.provider, id))?;
    if account.auth_method == IntegrationAuthMethod::Ssh {
        let key_path = ssh_private_key_path(app, id)?;
        if key_path.exists() {
            std::fs::remove_file(key_path)?;
        }
    }
    state.db.with(|conn| repo::delete(conn, id))?;
    log::info!(
        "removed {} integration account #{id}",
        account.provider.as_str()
    );
    Ok(())
}
