//! Public metadata for connected Git providers. Secrets are stored only in
//! the operating-system credential vault.

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::errors::{AppError, AppResult};
use crate::models::{GitProvider, IntegrationAccount, IntegrationAuthMethod};

const COLUMNS: &str = "id, provider, label, username, auth_method, base_url, avatar_url, \
                       ssh_public_key, created_at, updated_at";

fn row_to_account(row: &Row) -> rusqlite::Result<IntegrationAccount> {
    let provider_text: String = row.get("provider")?;
    let method_text: String = row.get("auth_method")?;
    let provider = GitProvider::parse(&provider_text).ok_or_else(|| {
        rusqlite::Error::FromSqlConversionFailure(
            1,
            rusqlite::types::Type::Text,
            format!("unknown Git provider: {provider_text}").into(),
        )
    })?;
    let auth_method = IntegrationAuthMethod::parse(&method_text).ok_or_else(|| {
        rusqlite::Error::FromSqlConversionFailure(
            4,
            rusqlite::types::Type::Text,
            format!("unknown authentication method: {method_text}").into(),
        )
    })?;

    Ok(IntegrationAccount {
        id: row.get("id")?,
        provider,
        label: row.get("label")?,
        username: row.get("username")?,
        auth_method,
        base_url: row.get("base_url")?,
        avatar_url: row.get("avatar_url")?,
        ssh_public_key: row.get("ssh_public_key")?,
        created_at: row.get::<_, DateTime<Utc>>("created_at")?,
        updated_at: row.get::<_, DateTime<Utc>>("updated_at")?,
    })
}

pub fn list(conn: &Connection) -> AppResult<Vec<IntegrationAccount>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {COLUMNS} FROM integration_accounts ORDER BY provider, created_at, id"
    ))?;
    let accounts = stmt
        .query_map([], row_to_account)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(accounts)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<IntegrationAccount> {
    conn.query_row(
        &format!("SELECT {COLUMNS} FROM integration_accounts WHERE id = ?1"),
        params![id],
        row_to_account,
    )
    .optional()?
    .ok_or(AppError::NotFound("Integration account"))
}

pub fn exists(conn: &Connection, id: i64) -> AppResult<bool> {
    Ok(conn
        .query_row(
            "SELECT 1 FROM integration_accounts WHERE id = ?1",
            params![id],
            |row| row.get::<_, i64>(0),
        )
        .optional()?
        .is_some())
}

#[allow(clippy::too_many_arguments)]
pub fn insert(
    conn: &Connection,
    provider: GitProvider,
    label: &str,
    username: Option<&str>,
    auth_method: IntegrationAuthMethod,
    base_url: &str,
    avatar_url: Option<&str>,
    ssh_public_key: Option<&str>,
) -> AppResult<IntegrationAccount> {
    let now = Utc::now();
    conn.execute(
        "INSERT INTO integration_accounts \
             (provider, label, username, auth_method, base_url, avatar_url, ssh_public_key, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
        params![
            provider.as_str(),
            label,
            username,
            auth_method.as_str(),
            base_url,
            avatar_url,
            ssh_public_key,
            now,
        ],
    )?;
    get(conn, conn.last_insert_rowid())
}

pub fn update_identity(
    conn: &Connection,
    id: i64,
    username: &str,
    avatar_url: Option<&str>,
) -> AppResult<()> {
    conn.execute(
        "UPDATE integration_accounts SET username = ?1, avatar_url = ?2, updated_at = ?3 WHERE id = ?4",
        params![username, avatar_url, Utc::now(), id],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    if conn.execute(
        "DELETE FROM integration_accounts WHERE id = ?1",
        params![id],
    )? == 0
    {
        return Err(AppError::NotFound("Integration account"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;

    #[test]
    fn stores_provider_metadata_without_secrets() {
        let db = Database::open_in_memory().unwrap();
        let account = db
            .with(|conn| {
                insert(
                    conn,
                    GitProvider::GitLab,
                    "Work",
                    Some("alice"),
                    IntegrationAuthMethod::Pat,
                    "https://git.example.com",
                    None,
                    None,
                )
            })
            .unwrap();

        assert_eq!(account.provider, GitProvider::GitLab);
        assert_eq!(account.base_url, "https://git.example.com");
        assert_eq!(db.with(|conn| list(conn)).unwrap().len(), 1);
    }
}
