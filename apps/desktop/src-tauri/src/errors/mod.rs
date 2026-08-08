//! Structured application errors shared across the backend.
//!
//! Every Tauri command returns [`AppResult`]. Failures cross the IPC
//! boundary as a safe `{ kind, message }` payload; the detailed cause is
//! only written to the local application log.

use serde::ser::Serializer;
use serde::Serialize;

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupFileIssue {
    pub source_id: i64,
    pub relative_path: String,
}

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    /// User input failed validation. The message is written for end users
    /// and safe to display verbatim.
    #[error("{0}")]
    Validation(String),

    #[error("{0} was not found")]
    NotFound(&'static str),

    #[error("A database error occurred")]
    Database(#[from] rusqlite::Error),

    #[error("A filesystem error occurred")]
    Filesystem(#[from] std::io::Error),

    /// Message is written for end users and safe to display.
    #[error("{0}")]
    GitHub(String),

    /// Provider/API message written for end users and safe to display.
    #[error("{0}")]
    Integration(String),

    /// AI provider failure with a redacted, user-safe message.
    #[error("{0}")]
    Ai(String),

    #[error("A Git operation failed")]
    Git(#[from] git2::Error),

    #[error("A network error occurred. Check your connection and try again.")]
    Network(#[from] reqwest::Error),

    #[error("Secure credential storage is unavailable")]
    Credential(#[from] keyring::Error),

    /// Safe operating-system integration error shown to the user.
    #[error("{0}")]
    System(String),

    /// The message is safe for the UI; detail is written only to local logs.
    #[error("{message}")]
    Update { message: String, detail: String },

    /// A single source path prevented a backup. The relative path is safe
    /// to show and can be converted into an exact exclude rule by the user.
    #[error("{message}")]
    BackupFile {
        message: String,
        source_id: i64,
        relative_path: String,
        detail: String,
    },

    #[error("An internal error occurred")]
    Tauri(#[from] tauri::Error),

    /// The inner string is diagnostic detail for the log, not for display.
    #[error("An internal error occurred")]
    Internal(String),
}

impl AppError {
    pub fn internal(detail: impl Into<String>) -> Self {
        AppError::Internal(detail.into())
    }

    pub fn backup_file(
        message: impl Into<String>,
        source_id: i64,
        relative_path: impl Into<String>,
        detail: impl Into<String>,
    ) -> Self {
        Self::BackupFile {
            message: message.into(),
            source_id,
            relative_path: relative_path.into(),
            detail: detail.into(),
        }
    }

    pub fn update(message: impl Into<String>, detail: impl Into<String>) -> Self {
        Self::Update {
            message: message.into(),
            detail: detail.into(),
        }
    }

    pub fn file_issue(&self) -> Option<BackupFileIssue> {
        match self {
            Self::BackupFile {
                source_id,
                relative_path,
                ..
            } => Some(BackupFileIssue {
                source_id: *source_id,
                relative_path: relative_path.clone(),
            }),
            _ => None,
        }
    }

    /// Human-readable text safe for the UI and run history. In particular,
    /// raw libgit2 messages can contain private absolute paths, so known
    /// failures are translated instead of forwarded verbatim.
    pub fn user_message(&self) -> String {
        match self {
            Self::Database(error) => database_user_message(error),
            Self::Git(error) => {
                let raw = error.message().to_ascii_lowercase();
                if raw.contains("path too long") {
                    "A file path is too long for the local Git workspace. NextHive could not create the commit."
                        .into()
                } else if raw.contains("index.lock") || raw.contains("locked") {
                    "The local backup repository is locked by another operation. Try again in a moment."
                        .into()
                } else if raw.contains("not found") {
                    "A file changed or disappeared while Git was preparing the backup. Try again."
                        .into()
                } else {
                    format!(
                        "Git could not complete the backup (error class {:?}, code {:?}). Check the local logs for technical details.",
                        error.class(),
                        error.code()
                    )
                }
            }
            _ => self.to_string(),
        }
    }

    /// Stable machine-readable discriminant used by the frontend.
    pub fn kind(&self) -> &'static str {
        match self {
            AppError::Validation(_) => "validation",
            AppError::NotFound(_) => "notFound",
            AppError::Database(_) => "database",
            AppError::Filesystem(_) => "filesystem",
            AppError::GitHub(_) => "github",
            AppError::Integration(_) => "integration",
            AppError::Ai(_) => "ai",
            AppError::Git(_) => "git",
            AppError::Network(_) => "network",
            AppError::Credential(_) => "credential",
            AppError::System(_) => "system",
            AppError::Update { .. } => "update",
            AppError::BackupFile { .. } => "backupFile",
            AppError::Tauri(_) => "internal",
            AppError::Internal(_) => "internal",
        }
    }
}

fn database_user_message(error: &rusqlite::Error) -> String {
    use rusqlite::ffi::ErrorCode;

    let code = match error {
        rusqlite::Error::SqliteFailure(error, _) => Some(error.code),
        rusqlite::Error::SqlInputError { error, .. } => Some(error.code),
        _ => None,
    };
    match code {
        Some(ErrorCode::DatabaseBusy | ErrorCode::DatabaseLocked) => {
            "The local database is busy. Wait a moment and try again.".into()
        }
        Some(ErrorCode::DatabaseCorrupt | ErrorCode::NotADatabase) => {
            "The local database failed an integrity check. Open Settings and use Database Maintenance before continuing."
                .into()
        }
        Some(ErrorCode::ReadOnly | ErrorCode::PermissionDenied | ErrorCode::CannotOpen) => {
            "NextHive cannot write to its local database. Check disk permissions and available security software, then try again."
                .into()
        }
        Some(ErrorCode::DiskFull) => {
            "The local database cannot be updated because the disk is full.".into()
        }
        Some(ErrorCode::ConstraintViolation) => {
            "The database rejected conflicting data. Refresh the page and try the operation again."
                .into()
        }
        _ => {
            let detail = error.to_string().to_ascii_lowercase();
            if detail.contains("no such column") || detail.contains("no such table") {
                "The local database schema is incomplete. Restart NextHive to apply migrations, or use Database Maintenance in Settings."
                    .into()
            } else {
                "The local database operation failed. Open Settings and run Database Maintenance; technical details were saved to the logs."
                    .into()
            }
        }
    }
}

#[derive(Serialize)]
struct ErrorPayload {
    kind: &'static str,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    file_issue: Option<BackupFileIssue>,
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        // Serialization happens exactly once, when the error is returned to
        // the frontend — log the full detail here, ship only the safe text.
        log::error!("command failed: {self:?}");
        ErrorPayload {
            kind: self.kind(),
            message: self.user_message(),
            file_issue: self.file_issue(),
        }
        .serialize(serializer)
    }
}
