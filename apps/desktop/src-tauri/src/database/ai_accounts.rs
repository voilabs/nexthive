//! Public AI provider metadata. API keys are stored only in the OS vault.

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::errors::{AppError, AppResult};
use crate::models::{AiProvider, AiProviderAccount};

const COLUMNS: &str = "id, provider, label, base_url, model, created_at, updated_at";

fn row_to_account(row: &Row) -> rusqlite::Result<AiProviderAccount> {
    let provider_text: String = row.get("provider")?;
    let provider = AiProvider::parse(&provider_text).ok_or_else(|| {
        rusqlite::Error::FromSqlConversionFailure(
            1,
            rusqlite::types::Type::Text,
            format!("unknown AI provider: {provider_text}").into(),
        )
    })?;
    Ok(AiProviderAccount {
        id: row.get("id")?,
        provider,
        label: row.get("label")?,
        base_url: row.get("base_url")?,
        model: row.get("model")?,
        created_at: row.get::<_, DateTime<Utc>>("created_at")?,
        updated_at: row.get::<_, DateTime<Utc>>("updated_at")?,
    })
}

pub fn list(conn: &Connection) -> AppResult<Vec<AiProviderAccount>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {COLUMNS} FROM ai_provider_accounts ORDER BY provider, created_at, id"
    ))?;
    let accounts = stmt
        .query_map([], row_to_account)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(accounts)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<AiProviderAccount> {
    conn.query_row(
        &format!("SELECT {COLUMNS} FROM ai_provider_accounts WHERE id = ?1"),
        params![id],
        row_to_account,
    )
    .optional()?
    .ok_or(AppError::NotFound("AI provider account"))
}

pub fn exists(conn: &Connection, id: i64) -> AppResult<bool> {
    Ok(conn
        .query_row(
            "SELECT 1 FROM ai_provider_accounts WHERE id = ?1",
            params![id],
            |row| row.get::<_, i64>(0),
        )
        .optional()?
        .is_some())
}

pub fn insert(
    conn: &Connection,
    provider: AiProvider,
    label: &str,
    base_url: &str,
    model: &str,
) -> AppResult<AiProviderAccount> {
    let now = Utc::now();
    conn.execute(
        "INSERT INTO ai_provider_accounts \
             (provider, label, base_url, model, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
        params![provider.as_str(), label, base_url, model, now],
    )?;
    get(conn, conn.last_insert_rowid())
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute(
        "UPDATE backup_settings SET ai_account_id = NULL, \
             ai_major_commit_messages_enabled = 0, ai_fast_commit_messages_enabled = 0 \
         WHERE ai_account_id = ?1",
        params![id],
    )?;
    if conn.execute(
        "DELETE FROM ai_provider_accounts WHERE id = ?1",
        params![id],
    )? == 0
    {
        return Err(AppError::NotFound("AI provider account"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;

    #[test]
    fn stores_only_public_ai_metadata() {
        let db = Database::open_in_memory().unwrap();
        let account = db
            .with(|conn| {
                insert(
                    conn,
                    AiProvider::Ollama,
                    "Local",
                    "http://127.0.0.1:11434",
                    "qwen3:4b",
                )
            })
            .unwrap();

        assert_eq!(account.provider, AiProvider::Ollama);
        assert_eq!(account.model, "qwen3:4b");
        let columns: Vec<String> = db
            .with(|conn| {
                let mut statement = conn.prepare("PRAGMA table_info(ai_provider_accounts)")?;
                let columns = statement
                    .query_map([], |row| row.get(1))?
                    .collect::<Result<Vec<_>, _>>()?;
                Ok(columns)
            })
            .unwrap();
        assert!(!columns.iter().any(|column| column.contains("key")));
        assert!(!columns.iter().any(|column| column.contains("token")));
    }
}
