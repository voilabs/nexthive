use tauri::{AppHandle, Manager};

use crate::credentials::{provider_token_key, CredentialStore, KeyringStore};
use crate::database::{integration_accounts, profiles};
use crate::errors::{AppError, AppResult};
use crate::integrations::provider_api::{self, CreateRepositoryOutcome};
use crate::models::{BackupProfile, IntegrationAuthMethod, RepositorySummary};
use crate::state::AppState;

const MAX_SLUG_LENGTH: usize = 50;
const MAX_NAME_ATTEMPTS: u32 = 6;

pub async fn list_for_account(
    app: &AppHandle,
    account_id: i64,
) -> AppResult<Vec<RepositorySummary>> {
    let state = app.state::<AppState>();
    let account = state
        .db
        .with(|conn| integration_accounts::get(conn, account_id))?;
    if account.auth_method != IntegrationAuthMethod::Pat {
        return Err(AppError::Validation(
            "Listing repositories requires a token-based account.".into(),
        ));
    }
    let Some(token) = KeyringStore.get_secret(&provider_token_key(account.provider, account.id))?
    else {
        return Err(AppError::Validation(
            "No token is stored for this account. Remove it and add it again.".into(),
        ));
    };

    Ok(
        provider_api::list_repositories(account.provider, &account.base_url, &token)
            .await?
            .into_iter()
            .map(|repository| RepositorySummary {
                name: repository.name,
                full_name: repository.full_name,
                owner: repository.owner,
                private: repository.private,
                html_url: repository.html_url,
                default_branch: repository.default_branch,
            })
            .collect(),
    )
}

pub async fn create_for_profile(app: &AppHandle, profile_id: i64) -> AppResult<BackupProfile> {
    let state = app.state::<AppState>();
    let profile = state.db.with(|conn| profiles::get(conn, profile_id))?;
    if profile.repository_name.is_some() {
        return Err(AppError::Validation(
            "This profile already has a repository.".into(),
        ));
    }
    let Some(account_id) = profile.integration_account_id else {
        return Err(AppError::Validation(
            "Link a Git provider account to the profile first.".into(),
        ));
    };
    let account = state
        .db
        .with(|conn| integration_accounts::get(conn, account_id))?;
    if account.auth_method != IntegrationAuthMethod::Pat {
        return Err(AppError::Validation(
            "Automatic repository creation requires a token-based account.".into(),
        ));
    }
    let Some(token) = KeyringStore.get_secret(&provider_token_key(account.provider, account.id))?
    else {
        return Err(AppError::Validation(
            "No token is stored for the linked account. Remove it and add it again.".into(),
        ));
    };

    let base_name = repository_base_name(&profile.name);
    let description = format!("NextHive automated backups — profile \"{}\"", profile.name);
    for attempt in 0..MAX_NAME_ATTEMPTS {
        let candidate = if attempt == 0 {
            base_name.clone()
        } else {
            format!("{base_name}-{}", attempt + 1)
        };
        match provider_api::create_private_repository(
            account.provider,
            &account.base_url,
            &token,
            &candidate,
            &description,
        )
        .await?
        {
            CreateRepositoryOutcome::Created(repository) => {
                log::info!(
                    "created {} backup repository {} for profile #{profile_id}",
                    account.provider.as_str(),
                    repository.full_name
                );
                return state.db.with(|conn| {
                    profiles::set_repository(
                        conn,
                        profile_id,
                        &repository.owner,
                        &repository.name,
                        &repository.html_url,
                    )
                });
            }
            CreateRepositoryOutcome::NameTaken => continue,
        }
    }

    Err(AppError::Integration(format!(
        "{} could not find a free repository name after {MAX_NAME_ATTEMPTS} attempts. Rename or remove an old backup repository and try again.",
        account.provider.display_name()
    )))
}

fn repository_base_name(profile_name: &str) -> String {
    let slug = slugify(profile_name);
    if slug.is_empty() {
        "nexthive-backup".into()
    } else {
        format!("nexthive-{slug}")
    }
}

fn slugify(name: &str) -> String {
    let transliterated: String = name
        .chars()
        .map(|character| match character {
            'ç' | 'Ç' => 'c',
            'ğ' | 'Ğ' => 'g',
            'ı' | 'İ' => 'i',
            'ö' | 'Ö' => 'o',
            'ş' | 'Ş' => 's',
            'ü' | 'Ü' => 'u',
            'ä' | 'Ä' | 'â' | 'Â' | 'á' | 'Á' | 'à' | 'À' => 'a',
            'é' | 'É' | 'è' | 'È' | 'ê' | 'Ê' => 'e',
            'î' | 'Î' | 'í' | 'Í' => 'i',
            'ô' | 'Ô' | 'ó' | 'Ó' => 'o',
            'û' | 'Û' | 'ú' | 'Ú' => 'u',
            other => other,
        })
        .collect();

    let mut slug = String::with_capacity(transliterated.len());
    let mut previous_dash = true;
    for character in transliterated.chars() {
        if character.is_ascii_alphanumeric() {
            slug.push(character.to_ascii_lowercase());
            previous_dash = false;
        } else if !previous_dash {
            slug.push('-');
            previous_dash = true;
        }
        if slug.len() >= MAX_SLUG_LENGTH {
            break;
        }
    }
    slug.trim_matches('-').to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn provider_neutral_repository_name() {
        assert_eq!(
            repository_base_name("Çalışma Dosyaları"),
            "nexthive-calisma-dosyalari"
        );
        assert_eq!(repository_base_name("!!!"), "nexthive-backup");
    }
}
