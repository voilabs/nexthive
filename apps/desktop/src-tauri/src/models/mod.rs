//! Domain models mirroring the SQLite schema, serialized to the frontend
//! in camelCase. Keep these in sync with `src/types` on the React side.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DatabaseHealthStatus {
    Healthy,
    NeedsRepair,
    Corrupt,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseHealthReport {
    pub status: DatabaseHealthStatus,
    pub schema_version: i64,
    pub expected_schema_version: i64,
    pub integrity_ok: bool,
    pub foreign_key_violations: usize,
    pub missing_schema_items: Vec<String>,
    pub database_size: u64,
    pub repair_available: bool,
    pub message: String,
    pub checked_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseRepairResult {
    pub before: DatabaseHealthReport,
    pub after: DatabaseHealthReport,
    pub backup_path: String,
    pub repairs_applied: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupProfile {
    pub id: i64,
    pub name: String,
    pub repository_owner: Option<String>,
    pub repository_name: Option<String>,
    pub repository_url: Option<String>,
    pub branch: String,
    pub enabled: bool,
    pub integration_account_id: Option<i64>,
    pub target_type: BackupTargetType,
    pub s3_account_id: Option<i64>,
    pub s3_prefix: Option<String>,
    pub automatic_profile_rule_id: Option<i64>,
    pub automatic_profile_rule_name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BackupTargetType {
    Git,
    S3,
}

impl BackupTargetType {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Git => "git",
            Self::S3 => "s3",
        }
    }
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "git" => Some(Self::Git),
            "s3" => Some(Self::S3),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct S3Account {
    pub id: i64,
    pub label: String,
    pub endpoint: Option<String>,
    pub region: String,
    pub bucket: String,
    pub path_style: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateS3AccountInput {
    pub label: String,
    #[serde(default)]
    pub endpoint: Option<String>,
    pub region: String,
    pub bucket: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    #[serde(default)]
    pub path_style: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupSource {
    pub id: i64,
    pub profile_id: i64,
    pub path: String,
    pub enabled: bool,
    pub exclude_profile_id: Option<i64>,
    pub scan_mode: SourceScanMode,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SourceScanMode {
    Recursive,
    DirectFiles,
}

impl SourceScanMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Recursive => "recursive",
            Self::DirectFiles => "direct_files",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "recursive" => Some(Self::Recursive),
            "direct_files" => Some(Self::DirectFiles),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AutomaticProfileEntryKind {
    RootFiles,
    Directory,
}

impl AutomaticProfileEntryKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::RootFiles => "root_files",
            Self::Directory => "directory",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "root_files" => Some(Self::RootFiles),
            "directory" => Some(Self::Directory),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AutomaticProfileMemberStatus {
    Active,
    Missing,
    Error,
}

impl AutomaticProfileMemberStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Missing => "missing",
            Self::Error => "error",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "active" => Some(Self::Active),
            "missing" => Some(Self::Missing),
            "error" => Some(Self::Error),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomaticProfileMember {
    pub id: i64,
    pub rule_id: i64,
    pub entry_key: String,
    pub entry_name: String,
    pub entry_kind: AutomaticProfileEntryKind,
    pub profile_id: Option<i64>,
    pub source_id: Option<i64>,
    pub source_path: String,
    pub status: AutomaticProfileMemberStatus,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomaticProfileRule {
    pub id: i64,
    pub name: String,
    pub root_path: String,
    pub enabled: bool,
    pub integration_account_id: Option<i64>,
    pub target_type: BackupTargetType,
    pub s3_account_id: Option<i64>,
    pub s3_prefix: Option<String>,
    pub branch: String,
    pub exclude_profile_id: Option<i64>,
    pub backup_time: Option<String>,
    pub backup_on_startup: bool,
    pub notifications_enabled: bool,
    pub continuous_backup_enabled: bool,
    pub change_debounce_seconds: u32,
    pub ai_account_id: Option<i64>,
    pub ai_major_commit_messages_enabled: bool,
    pub ai_fast_commit_messages_enabled: bool,
    pub auto_create_repositories: bool,
    pub last_reconciled_at: Option<DateTime<Utc>>,
    pub last_error: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub members: Vec<AutomaticProfileMember>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveAutomaticProfileRuleInput {
    pub name: String,
    pub root_path: String,
    #[serde(default)]
    pub integration_account_id: Option<i64>,
    #[serde(default)]
    pub target_type: Option<BackupTargetType>,
    #[serde(default)]
    pub s3_account_id: Option<i64>,
    #[serde(default)]
    pub s3_prefix: Option<String>,
    #[serde(default)]
    pub branch: Option<String>,
    #[serde(default)]
    pub exclude_profile_id: Option<i64>,
    #[serde(default)]
    pub backup_time: Option<String>,
    #[serde(default)]
    pub backup_on_startup: bool,
    #[serde(default = "default_true")]
    pub notifications_enabled: bool,
    #[serde(default = "default_true")]
    pub continuous_backup_enabled: bool,
    #[serde(default = "default_debounce")]
    pub change_debounce_seconds: u32,
    #[serde(default)]
    pub ai_account_id: Option<i64>,
    #[serde(default)]
    pub ai_major_commit_messages_enabled: bool,
    #[serde(default)]
    pub ai_fast_commit_messages_enabled: bool,
    #[serde(default = "default_true")]
    pub auto_create_repositories: bool,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

fn default_debounce() -> u32 {
    10
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomaticProfileSyncResult {
    pub rule: AutomaticProfileRule,
    pub profiles_created: usize,
    pub profiles_reactivated: usize,
    pub profiles_marked_missing: usize,
    pub repositories_created: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExcludeRule {
    pub id: i64,
    pub exclude_profile_id: i64,
    pub kind: ExcludeRuleKind,
    pub pattern: String,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExcludeRuleKind {
    Glob,
    Exact,
}

impl ExcludeRuleKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Glob => "glob",
            Self::Exact => "exact",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "glob" => Some(Self::Glob),
            "exact" => Some(Self::Exact),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExcludeProfile {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    /// Number of backup sources currently using this profile.
    pub used_by: i64,
    pub rules: Vec<ExcludeRule>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileSnapshot {
    pub id: i64,
    pub source_id: i64,
    pub relative_path: String,
    pub hash: String,
    pub size: i64,
    pub modified_at: DateTime<Utc>,
    pub last_seen_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BackupRunStatus {
    Running,
    Success,
    Failed,
    Cancelled,
}

impl BackupRunStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            BackupRunStatus::Running => "running",
            BackupRunStatus::Success => "success",
            BackupRunStatus::Failed => "failed",
            BackupRunStatus::Cancelled => "cancelled",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "running" => Some(BackupRunStatus::Running),
            "success" => Some(BackupRunStatus::Success),
            "failed" => Some(BackupRunStatus::Failed),
            "cancelled" => Some(BackupRunStatus::Cancelled),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupRun {
    pub id: i64,
    pub profile_id: i64,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub status: BackupRunStatus,
    pub files_added: i64,
    pub files_modified: i64,
    pub files_deleted: i64,
    pub bytes_processed: i64,
    pub commit_sha: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupSettings {
    pub profile_id: i64,
    /// "HH:MM" in the configured application time zone; `None` disables it.
    pub backup_time: Option<String>,
    pub backup_on_startup: bool,
    pub autostart_enabled: bool,
    pub notifications_enabled: bool,
    pub continuous_backup_enabled: bool,
    /// Quiet period used to stack bursts of filesystem events into one backup.
    pub change_debounce_seconds: u32,
    pub ai_account_id: Option<i64>,
    /// AI messages for scheduled, startup and manual (major) backups.
    pub ai_major_commit_messages_enabled: bool,
    /// AI messages for filesystem-triggered (fast) backups.
    pub ai_fast_commit_messages_enabled: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub launch_at_startup: bool,
    pub minimize_to_tray: bool,
    pub theme: AppTheme,
    /// "system" or a language tag like "en" — see [`validate_language`].
    pub language: String,
    pub time_zone: String,
    /// Anonymous daily "one device is alive" ping (version + OS, nothing else).
    pub telemetry_enabled: bool,
}

/// "system" or a well-formed BCP-47-style tag ("en", "tr", "de-AT").
///
/// The list of languages the app actually ships lives entirely in the
/// frontend (src/i18n/languages/*.ts); the backend stores any valid tag so
/// adding a language never requires a Rust change or a migration.
pub fn validate_language(value: &str) -> bool {
    if value == "system" {
        return true;
    }
    let mut parts = value.split('-');
    let Some(primary) = parts.next() else {
        return false;
    };
    if !(2..=3).contains(&primary.len()) || !primary.chars().all(|c| c.is_ascii_lowercase()) {
        return false;
    }
    parts.all(|part| {
        (1..=8).contains(&part.len()) && part.chars().all(|c| c.is_ascii_alphanumeric())
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AppTheme {
    Light,
    Dark,
    System,
}

impl AppTheme {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Light => "light",
            Self::Dark => "dark",
            Self::System => "system",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "light" => Some(Self::Light),
            "dark" => Some(Self::Dark),
            "system" => Some(Self::System),
            _ => None,
        }
    }
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAppSettingsInput {
    #[serde(default)]
    pub launch_at_startup: Option<bool>,
    #[serde(default)]
    pub minimize_to_tray: Option<bool>,
    #[serde(default)]
    pub theme: Option<AppTheme>,
    #[serde(default)]
    pub language: Option<String>,
    #[serde(default)]
    pub time_zone: Option<String>,
    #[serde(default)]
    pub telemetry_enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBackupProfileInput {
    pub name: String,
    #[serde(default)]
    pub target_type: Option<BackupTargetType>,
    #[serde(default)]
    pub repository_owner: Option<String>,
    #[serde(default)]
    pub repository_name: Option<String>,
    #[serde(default)]
    pub repository_url: Option<String>,
    #[serde(default)]
    pub branch: Option<String>,
    #[serde(default)]
    pub integration_account_id: Option<i64>,
    #[serde(default)]
    pub s3_account_id: Option<i64>,
    #[serde(default)]
    pub s3_prefix: Option<String>,
}

/// Fields left as `None` are not modified. Double-option fields treat an
/// explicit `null` as "clear".
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateBackupProfileInput {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default, deserialize_with = "double_option")]
    pub repository_owner: Option<Option<String>>,
    #[serde(default, deserialize_with = "double_option")]
    pub repository_name: Option<Option<String>>,
    #[serde(default, deserialize_with = "double_option")]
    pub repository_url: Option<Option<String>>,
    #[serde(default)]
    pub branch: Option<String>,
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub target_type: Option<BackupTargetType>,
    /// Omitted = unchanged, `null` = unlink, number = link to that account.
    #[serde(default, deserialize_with = "double_option")]
    pub integration_account_id: Option<Option<i64>>,
    #[serde(default, deserialize_with = "double_option")]
    pub s3_account_id: Option<Option<i64>>,
    #[serde(default, deserialize_with = "double_option")]
    pub s3_prefix: Option<Option<String>>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateBackupSettingsInput {
    /// Omitted = unchanged, `null` = disable the daily backup.
    #[serde(default, deserialize_with = "double_option")]
    pub backup_time: Option<Option<String>>,
    #[serde(default)]
    pub backup_on_startup: Option<bool>,
    #[serde(default)]
    pub autostart_enabled: Option<bool>,
    #[serde(default)]
    pub notifications_enabled: Option<bool>,
    #[serde(default)]
    pub continuous_backup_enabled: Option<bool>,
    #[serde(default)]
    pub change_debounce_seconds: Option<u32>,
    /// Omitted = unchanged, `null` = unlink the AI account.
    #[serde(default, deserialize_with = "double_option")]
    pub ai_account_id: Option<Option<i64>>,
    #[serde(default)]
    pub ai_major_commit_messages_enabled: Option<bool>,
    #[serde(default)]
    pub ai_fast_commit_messages_enabled: Option<bool>,
}

/// Distinguishes an absent JSON field (outer `None`) from an explicit
/// `null` (`Some(None)`), which plain `Option` flattens.
fn double_option<'de, T, D>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    T: serde::Deserialize<'de>,
    D: serde::Deserializer<'de>,
{
    serde::Deserialize::deserialize(deserializer).map(Some)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AiProvider {
    OpenAi,
    OpenRouter,
    Anthropic,
    Ollama,
    Custom,
}

impl AiProvider {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::OpenAi => "openai",
            Self::OpenRouter => "openrouter",
            Self::Anthropic => "anthropic",
            Self::Ollama => "ollama",
            Self::Custom => "custom",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "openai" => Some(Self::OpenAi),
            "openrouter" => Some(Self::OpenRouter),
            "anthropic" => Some(Self::Anthropic),
            "ollama" => Some(Self::Ollama),
            "custom" => Some(Self::Custom),
            _ => None,
        }
    }

    pub fn display_name(self) -> &'static str {
        match self {
            Self::OpenAi => "OpenAI",
            Self::OpenRouter => "OpenRouter",
            Self::Anthropic => "Anthropic Claude",
            Self::Ollama => "Ollama",
            Self::Custom => "Custom OpenAI-compatible",
        }
    }

    pub fn requires_api_key(self) -> bool {
        matches!(self, Self::OpenAi | Self::OpenRouter | Self::Anthropic)
    }
}

/// Public AI connection metadata. API keys stay in the operating-system
/// credential vault and are never serialized into this model.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderAccount {
    pub id: i64,
    pub provider: AiProvider,
    pub label: String,
    pub base_url: String,
    pub model: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAiProviderAccountInput {
    pub provider: AiProvider,
    pub label: String,
    #[serde(default)]
    pub base_url: Option<String>,
    pub model: String,
    #[serde(default)]
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiConnectionTestResult {
    pub success: bool,
    pub message: String,
    pub sample: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum IntegrationAuthMethod {
    Pat,
    Ssh,
}

impl IntegrationAuthMethod {
    pub fn as_str(self) -> &'static str {
        match self {
            IntegrationAuthMethod::Pat => "pat",
            IntegrationAuthMethod::Ssh => "ssh",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "pat" => Some(IntegrationAuthMethod::Pat),
            "ssh" => Some(IntegrationAuthMethod::Ssh),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GitProvider {
    GitHub,
    GitLab,
    Gitea,
}

impl GitProvider {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::GitHub => "github",
            Self::GitLab => "gitlab",
            Self::Gitea => "gitea",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "github" => Some(Self::GitHub),
            "gitlab" => Some(Self::GitLab),
            "gitea" => Some(Self::Gitea),
            _ => None,
        }
    }

    pub fn display_name(self) -> &'static str {
        match self {
            Self::GitHub => "GitHub",
            Self::GitLab => "GitLab",
            Self::Gitea => "Gitea / Forgejo",
        }
    }
}

/// A connected Git provider account. Never carries secrets — tokens live in the
/// OS keychain and SSH private keys on disk under the app data dir.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntegrationAccount {
    pub id: i64,
    pub provider: GitProvider,
    pub label: String,
    pub username: Option<String>,
    pub auth_method: IntegrationAuthMethod,
    pub base_url: String,
    pub avatar_url: Option<String>,
    pub ssh_public_key: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AddTokenAccountResult {
    pub account: IntegrationAccount,
    /// Non-fatal issue detected during validation (e.g. missing scope).
    pub warning: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionTestResult {
    pub success: bool,
    pub message: String,
}

/// A repository available on a connected account, offered as a backup
/// destination in the profile form.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositorySummary {
    pub name: String,
    pub full_name: String,
    pub owner: String,
    pub private: bool,
    pub html_url: String,
    pub default_branch: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub tauri_version: String,
    pub platform: String,
    pub arch: String,
    pub data_dir: String,
    pub database_path: String,
    pub log_dir: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdate {
    pub version: String,
    pub current_version: String,
    pub notes: Option<String>,
    pub published_at: Option<String>,
}
