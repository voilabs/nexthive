use tauri::{AppHandle, Manager};

use crate::ai::{commit_message, provider};
use crate::credentials::{ai_api_key, CredentialStore, KeyringStore};
use crate::database::ai_accounts;
use crate::errors::{AppError, AppResult};
use crate::models::{AiConnectionTestResult, AiProviderAccount, CreateAiProviderAccountInput};
use crate::state::AppState;

fn clean_field<'a>(value: &'a str, name: &str, maximum: usize) -> AppResult<&'a str> {
    let value = value.trim();
    if value.is_empty() {
        return Err(AppError::Validation(format!("{name} cannot be empty.")));
    }
    if value.chars().count() > maximum || value.contains(['\r', '\n']) {
        return Err(AppError::Validation(format!(
            "{name} is too long or contains an invalid line break."
        )));
    }
    Ok(value)
}

fn probe(
    provider_account: &AiProviderAccount,
    api_key: Option<&str>,
) -> AppResult<AiConnectionTestResult> {
    let (system, user) = commit_message::test_prompts();
    let generated = provider::generate(
        provider_account.provider,
        &provider_account.base_url,
        &provider_account.model,
        api_key,
        system,
        user,
    )?;
    let sample = commit_message::sanitize_generated(&generated).ok_or_else(|| {
        AppError::Ai("The AI provider returned an unusable test response.".into())
    })?;
    Ok(AiConnectionTestResult {
        success: true,
        message: format!(
            "Connected to {} with model {}.",
            provider_account.provider.display_name(),
            provider_account.model
        ),
        sample: Some(sample),
    })
}

pub fn create(
    app: &AppHandle,
    input: CreateAiProviderAccountInput,
) -> AppResult<AiProviderAccount> {
    let label = clean_field(&input.label, "Connection name", 60)?;
    let model = clean_field(&input.model, "Model", 160)?;
    let base_url = provider::normalize_base_url(input.provider, input.base_url.as_deref())?;
    let api_key = input
        .api_key
        .as_deref()
        .map(str::trim)
        .filter(|key| !key.is_empty());
    if input.provider.requires_api_key() && api_key.is_none() {
        return Err(AppError::Validation(format!(
            "Enter an API key for {}.",
            input.provider.display_name()
        )));
    }

    // Probe before persisting so a broken endpoint never appears connected.
    let candidate = AiProviderAccount {
        id: 0,
        provider: input.provider,
        label: label.to_string(),
        base_url: base_url.clone(),
        model: model.to_string(),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };
    probe(&candidate, api_key)?;

    let state = app.state::<AppState>();
    let account = state
        .db
        .with(|conn| ai_accounts::insert(conn, input.provider, label, &base_url, model))?;
    if let Some(api_key) = api_key {
        if let Err(error) = KeyringStore.save_secret(&ai_api_key(account.id), api_key) {
            let _ = state.db.with(|conn| ai_accounts::delete(conn, account.id));
            return Err(error);
        }
    }
    log::info!(
        "added {} AI connection #{}",
        account.provider.as_str(),
        account.id
    );
    Ok(account)
}

pub fn test(app: &AppHandle, id: i64) -> AppResult<AiConnectionTestResult> {
    let state = app.state::<AppState>();
    let account = state.db.with(|conn| ai_accounts::get(conn, id))?;
    let key = KeyringStore.get_secret(&ai_api_key(id))?;
    match probe(&account, key.as_deref()) {
        Ok(result) => Ok(result),
        Err(error) => {
            log::warn!("AI connection test failed for connection #{id}: {error:?}");
            Ok(AiConnectionTestResult {
                success: false,
                message: error.user_message(),
                sample: None,
            })
        }
    }
}

pub fn remove(app: &AppHandle, id: i64) -> AppResult<()> {
    let state = app.state::<AppState>();
    state.db.with(|conn| ai_accounts::get(conn, id))?;
    KeyringStore.delete_secret(&ai_api_key(id))?;
    state.db.with(|conn| ai_accounts::delete(conn, id))?;
    log::info!("removed AI connection #{id}");
    Ok(())
}
