//! Repository functions for backup profiles.
//!
//! These operate on a borrowed connection so callers control locking and
//! transactions; commands access them through `Database::with`.

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::errors::{AppError, AppResult};
use crate::models::{BackupProfile, CreateBackupProfileInput, UpdateBackupProfileInput};

const PROFILE_COLUMNS: &str = "profile.id, profile.name, profile.repository_owner, \
     profile.repository_name, profile.repository_url, profile.branch, profile.enabled, \
     profile.integration_account_id, profile.automatic_profile_rule_id, \
     automatic_rule.name AS automatic_profile_rule_name, profile.target_type, \
     profile.s3_account_id, profile.s3_prefix, profile.created_at, profile.updated_at";

const PROFILE_TABLES: &str = "backup_profiles AS profile \
     LEFT JOIN automatic_profile_rules AS automatic_rule \
       ON automatic_rule.id = profile.automatic_profile_rule_id";

const MAX_NAME_LENGTH: usize = 100;

fn row_to_profile(row: &Row) -> rusqlite::Result<BackupProfile> {
    Ok(BackupProfile {
        id: row.get("id")?,
        name: row.get("name")?,
        repository_owner: row.get("repository_owner")?,
        repository_name: row.get("repository_name")?,
        repository_url: row.get("repository_url")?,
        branch: row.get("branch")?,
        enabled: row.get::<_, i64>("enabled")? != 0,
        integration_account_id: row.get("integration_account_id")?,
        target_type: crate::models::BackupTargetType::parse(
            row.get::<_, String>("target_type")?.as_str(),
        )
        .ok_or_else(|| rusqlite::Error::InvalidQuery)?,
        s3_account_id: row.get("s3_account_id")?,
        s3_prefix: row.get("s3_prefix")?,
        automatic_profile_rule_id: row.get("automatic_profile_rule_id")?,
        automatic_profile_rule_name: row.get("automatic_profile_rule_name")?,
        created_at: row.get::<_, DateTime<Utc>>("created_at")?,
        updated_at: row.get::<_, DateTime<Utc>>("updated_at")?,
    })
}

fn validate_name(name: &str) -> AppResult<&str> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::Validation("Profile name cannot be empty.".into()));
    }
    if name.chars().count() > MAX_NAME_LENGTH {
        return Err(AppError::Validation(format!(
            "Profile name is too long (maximum {MAX_NAME_LENGTH} characters)."
        )));
    }
    Ok(name)
}

fn validate_branch(branch: &str) -> AppResult<&str> {
    let branch = branch.trim();
    if branch.is_empty() {
        return Err(AppError::Validation("Branch name cannot be empty.".into()));
    }
    if branch.chars().any(char::is_whitespace) || branch.contains("..") {
        return Err(AppError::Validation("Branch name is not valid.".into()));
    }
    Ok(branch)
}

/// Trim optional text input, mapping empty strings to `None`.
fn normalize(value: &Option<String>) -> Option<&str> {
    value
        .as_deref()
        .map(str::trim)
        .filter(|text| !text.is_empty())
}

pub fn list(conn: &Connection) -> AppResult<Vec<BackupProfile>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {PROFILE_COLUMNS} FROM {PROFILE_TABLES} \
         WHERE profile.archived_at IS NULL ORDER BY profile.created_at, profile.id"
    ))?;
    let profiles = stmt
        .query_map([], row_to_profile)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(profiles)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<BackupProfile> {
    conn.query_row(
        &format!(
            "SELECT {PROFILE_COLUMNS} FROM {PROFILE_TABLES} \
             WHERE profile.id = ?1 AND profile.archived_at IS NULL"
        ),
        params![id],
        row_to_profile,
    )
    .optional()?
    .ok_or(AppError::NotFound("Backup profile"))
}

pub fn create(conn: &mut Connection, input: &CreateBackupProfileInput) -> AppResult<BackupProfile> {
    create_with_owner(conn, input, None)
}

pub fn create_for_automatic_rule(
    conn: &mut Connection,
    input: &CreateBackupProfileInput,
    automatic_profile_rule_id: i64,
) -> AppResult<BackupProfile> {
    create_with_owner(conn, input, Some(automatic_profile_rule_id))
}

fn create_with_owner(
    conn: &mut Connection,
    input: &CreateBackupProfileInput,
    automatic_profile_rule_id: Option<i64>,
) -> AppResult<BackupProfile> {
    let name = validate_name(&input.name)?.to_owned();
    let branch = match normalize(&input.branch) {
        Some(branch) => validate_branch(branch)?.to_owned(),
        None => "main".to_owned(),
    };
    if let Some(account_id) = input.integration_account_id {
        if !crate::database::integration_accounts::exists(conn, account_id)? {
            return Err(AppError::NotFound("Integration account"));
        }
    }
    let target_type = input
        .target_type
        .unwrap_or(crate::models::BackupTargetType::Git);
    if target_type == crate::models::BackupTargetType::S3 {
        let account_id = input.s3_account_id.ok_or_else(|| {
            AppError::Validation("Choose an S3 destination for this profile.".into())
        })?;
        if !crate::database::s3_accounts::exists(conn, account_id)? {
            return Err(AppError::NotFound("S3 account"));
        }
    }
    let now = Utc::now();

    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO backup_profiles \
             (name, repository_owner, repository_name, repository_url, branch, enabled, \
              integration_account_id, automatic_profile_rule_id, target_type, s3_account_id, s3_prefix, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7, ?8, ?9, ?10, ?11, ?11)",
        params![
            name,
            normalize(&input.repository_owner),
            normalize(&input.repository_name),
            normalize(&input.repository_url),
            branch,
            input.integration_account_id,
            automatic_profile_rule_id,
            target_type.as_str(),
            input.s3_account_id,
            normalize(&input.s3_prefix),
            now,
        ],
    )?;
    let id = tx.last_insert_rowid();
    // Every profile owns exactly one settings row.
    tx.execute(
        "INSERT INTO backup_settings (profile_id) VALUES (?1)",
        params![id],
    )?;
    tx.commit()?;

    log::info!("created backup profile #{id}");
    get(conn, id)
}

pub fn update(
    conn: &Connection,
    id: i64,
    input: &UpdateBackupProfileInput,
) -> AppResult<BackupProfile> {
    let existing = get(conn, id)?;

    let name = match &input.name {
        Some(name) => validate_name(name)?.to_owned(),
        None => existing.name,
    };
    let branch = match &input.branch {
        Some(branch) => validate_branch(branch)?.to_owned(),
        None => existing.branch,
    };
    // Double-option repository fields: absent = keep, null = clear.
    let repository_owner = match &input.repository_owner {
        Some(value) => normalize(value).map(str::to_owned),
        None => existing.repository_owner,
    };
    let repository_name = match &input.repository_name {
        Some(value) => normalize(value).map(str::to_owned),
        None => existing.repository_name,
    };
    let repository_url = match &input.repository_url {
        Some(value) => normalize(value).map(str::to_owned),
        None => existing.repository_url,
    };
    let enabled = input.enabled.unwrap_or(existing.enabled);
    let target_type = input.target_type.unwrap_or(existing.target_type);
    let integration_account_id = match input.integration_account_id {
        Some(link) => {
            if let Some(account_id) = link {
                if !crate::database::integration_accounts::exists(conn, account_id)? {
                    return Err(AppError::NotFound("Integration account"));
                }
            }
            link
        }
        None => existing.integration_account_id,
    };
    let s3_account_id = match input.s3_account_id {
        Some(link) => {
            if let Some(id) = link {
                if !crate::database::s3_accounts::exists(conn, id)? {
                    return Err(AppError::NotFound("S3 account"));
                }
            }
            link
        }
        None => existing.s3_account_id,
    };
    let s3_prefix = match &input.s3_prefix {
        Some(value) => normalize(value).map(str::to_owned),
        None => existing.s3_prefix,
    };

    conn.execute(
        "UPDATE backup_profiles SET \
             name = ?1, repository_owner = ?2, repository_name = ?3, \
             repository_url = ?4, branch = ?5, enabled = ?6, \
             integration_account_id = ?7, target_type = ?8, s3_account_id = ?9, s3_prefix = ?10, updated_at = ?11 \
         WHERE id = ?12",
        params![
            name,
            repository_owner,
            repository_name,
            repository_url,
            branch,
            enabled,
            integration_account_id,
            target_type.as_str(),
            s3_account_id,
            s3_prefix,
            Utc::now(),
            id,
        ],
    )?;

    get(conn, id)
}

/// Record the freshly created backup repository on a profile.
pub fn set_repository(
    conn: &Connection,
    id: i64,
    owner: &str,
    name: &str,
    url: &str,
) -> AppResult<BackupProfile> {
    conn.execute(
        "UPDATE backup_profiles SET \
             repository_owner = ?1, repository_name = ?2, repository_url = ?3, updated_at = ?4 \
         WHERE id = ?5",
        params![owner, name, url, Utc::now(), id],
    )?;
    get(conn, id)
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    let changed = conn.execute("DELETE FROM backup_profiles WHERE id = ?1", params![id])?;
    if changed == 0 {
        return Err(AppError::NotFound("Backup profile"));
    }
    log::info!("deleted backup profile #{id}");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;

    fn input(name: &str) -> CreateBackupProfileInput {
        CreateBackupProfileInput {
            name: name.into(),
            repository_owner: None,
            repository_name: None,
            repository_url: None,
            branch: None,
            integration_account_id: None,
            target_type: None,
            s3_account_id: None,
            s3_prefix: None,
        }
    }

    #[test]
    fn create_list_update_delete_roundtrip() {
        let db = Database::open_in_memory().unwrap();

        let profile = db.with(|conn| create(conn, &input("Documents"))).unwrap();
        assert_eq!(profile.name, "Documents");
        assert_eq!(profile.branch, "main");
        assert!(profile.enabled);

        let all = db.with(|conn| list(conn)).unwrap();
        assert_eq!(all.len(), 1);

        let updated = db
            .with(|conn| {
                update(
                    conn,
                    profile.id,
                    &UpdateBackupProfileInput {
                        name: Some("Docs".into()),
                        enabled: Some(false),
                        ..Default::default()
                    },
                )
            })
            .unwrap();
        assert_eq!(updated.name, "Docs");
        assert!(!updated.enabled);

        db.with(|conn| delete(conn, profile.id)).unwrap();
        assert!(db.with(|conn| list(conn)).unwrap().is_empty());
    }

    #[test]
    fn create_seeds_settings_row() {
        let db = Database::open_in_memory().unwrap();
        let profile = db.with(|conn| create(conn, &input("Docs"))).unwrap();
        let count: i64 = db
            .with(|conn| {
                Ok(conn
                    .query_row(
                        "SELECT COUNT(*) FROM backup_settings WHERE profile_id = ?1",
                        params![profile.id],
                        |row| row.get(0),
                    )
                    .unwrap())
            })
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn rejects_blank_name() {
        let db = Database::open_in_memory().unwrap();
        let result = db.with(|conn| create(conn, &input("   ")));
        assert!(matches!(result, Err(AppError::Validation(_))));
    }

    #[test]
    fn delete_missing_profile_is_not_found() {
        let db = Database::open_in_memory().unwrap();
        let result = db.with(|conn| delete(conn, 42));
        assert!(matches!(result, Err(AppError::NotFound(_))));
    }
}
