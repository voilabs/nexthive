//! Secure credential storage.
//!
//! [`CredentialStore`] abstracts secret persistence so the PAT flow can be
//! swapped for OAuth/GitHub App auth later without touching callers.
//! The default implementation is the OS keychain (Windows Credential
//! Manager / macOS Keychain / Secret Service) via the `keyring` crate.
//!
//! Secrets never touch SQLite, config files, logs, Tauri events or the
//! frontend.

pub mod ssh_keys;

use crate::errors::{AppError, AppResult};
use crate::models::GitProvider;

const SERVICE_NAME: &str = "com.nexthive.app";

/// Keychain entry name for a GitHub account's personal access token.
pub fn github_pat_key(account_id: i64) -> String {
    format!("github-pat-{account_id}")
}

/// Preserve the original GitHub key name so existing installations retain
/// access to their stored token after the provider migration.
pub fn provider_token_key(provider: GitProvider, account_id: i64) -> String {
    match provider {
        GitProvider::GitHub => github_pat_key(account_id),
        GitProvider::GitLab => format!("gitlab-token-{account_id}"),
        GitProvider::Gitea => format!("gitea-token-{account_id}"),
    }
}

/// Keychain entry name for an AI provider API key. Local providers may not
/// have an entry at all.
pub fn ai_api_key(account_id: i64) -> String {
    format!("ai-provider-key-{account_id}")
}

pub trait CredentialStore: Send + Sync {
    fn save_secret(&self, key: &str, value: &str) -> AppResult<()>;
    fn get_secret(&self, key: &str) -> AppResult<Option<String>>;
    fn delete_secret(&self, key: &str) -> AppResult<()>;
}

/// OS-keychain-backed credential store.
#[derive(Default)]
pub struct KeyringStore;

impl KeyringStore {
    fn entry(&self, key: &str) -> AppResult<keyring::Entry> {
        Ok(keyring::Entry::new(SERVICE_NAME, key)?)
    }
}

impl CredentialStore for KeyringStore {
    fn save_secret(&self, key: &str, value: &str) -> AppResult<()> {
        self.entry(key)?.set_password(value)?;
        Ok(())
    }

    fn get_secret(&self, key: &str) -> AppResult<Option<String>> {
        match self.entry(key)?.get_password() {
            Ok(secret) => Ok(Some(secret)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(error) => Err(AppError::from(error)),
        }
    }

    fn delete_secret(&self, key: &str) -> AppResult<()> {
        match self.entry(key)?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(AppError::from(error)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn github_token_key_remains_backward_compatible() {
        assert_eq!(provider_token_key(GitProvider::GitHub, 9), "github-pat-9");
        assert_eq!(provider_token_key(GitProvider::GitLab, 9), "gitlab-token-9");
        assert_eq!(provider_token_key(GitProvider::Gitea, 9), "gitea-token-9");
    }
}
