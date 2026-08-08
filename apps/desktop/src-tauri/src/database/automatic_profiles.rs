//! Persistence for automatic-profile rules and their generated profile members.

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::errors::{AppError, AppResult};
use crate::models::{
    AutomaticProfileEntryKind, AutomaticProfileMember, AutomaticProfileMemberStatus,
    AutomaticProfileRule, SaveAutomaticProfileRuleInput,
};

const RULE_COLUMNS: &str = "id, name, root_path, enabled, integration_account_id, branch, \
    exclude_profile_id, backup_time, backup_on_startup, notifications_enabled, \
    continuous_backup_enabled, change_debounce_seconds, ai_account_id, \
    ai_major_commit_messages_enabled, ai_fast_commit_messages_enabled, \
    auto_create_repositories, last_reconciled_at, last_error, created_at, updated_at";

fn row_to_rule(row: &Row) -> rusqlite::Result<AutomaticProfileRule> {
    Ok(AutomaticProfileRule {
        id: row.get("id")?,
        name: row.get("name")?,
        root_path: row.get("root_path")?,
        enabled: row.get::<_, i64>("enabled")? != 0,
        integration_account_id: row.get("integration_account_id")?,
        branch: row.get("branch")?,
        exclude_profile_id: row.get("exclude_profile_id")?,
        backup_time: row.get("backup_time")?,
        backup_on_startup: row.get::<_, i64>("backup_on_startup")? != 0,
        notifications_enabled: row.get::<_, i64>("notifications_enabled")? != 0,
        continuous_backup_enabled: row.get::<_, i64>("continuous_backup_enabled")? != 0,
        change_debounce_seconds: row.get("change_debounce_seconds")?,
        ai_account_id: row.get("ai_account_id")?,
        ai_major_commit_messages_enabled: row.get::<_, i64>("ai_major_commit_messages_enabled")?
            != 0,
        ai_fast_commit_messages_enabled: row.get::<_, i64>("ai_fast_commit_messages_enabled")? != 0,
        auto_create_repositories: row.get::<_, i64>("auto_create_repositories")? != 0,
        last_reconciled_at: row.get::<_, Option<DateTime<Utc>>>("last_reconciled_at")?,
        last_error: row.get("last_error")?,
        created_at: row.get::<_, DateTime<Utc>>("created_at")?,
        updated_at: row.get::<_, DateTime<Utc>>("updated_at")?,
        members: Vec::new(),
    })
}

fn row_to_member(row: &Row) -> rusqlite::Result<AutomaticProfileMember> {
    let entry_kind = AutomaticProfileEntryKind::parse(row.get::<_, String>("entry_kind")?.as_str())
        .ok_or(rusqlite::Error::InvalidQuery)?;
    let status = AutomaticProfileMemberStatus::parse(row.get::<_, String>("status")?.as_str())
        .ok_or(rusqlite::Error::InvalidQuery)?;
    Ok(AutomaticProfileMember {
        id: row.get("id")?,
        rule_id: row.get("rule_id")?,
        entry_key: row.get("entry_key")?,
        entry_name: row.get("entry_name")?,
        entry_kind,
        profile_id: row.get("profile_id")?,
        source_id: row.get("source_id")?,
        source_path: row.get("source_path")?,
        status,
        error_message: row.get("error_message")?,
        created_at: row.get::<_, DateTime<Utc>>("created_at")?,
        updated_at: row.get::<_, DateTime<Utc>>("updated_at")?,
    })
}

fn validate_input(conn: &Connection, input: &SaveAutomaticProfileRuleInput) -> AppResult<()> {
    let name = input.name.trim();
    if name.is_empty() || name.chars().count() > 100 {
        return Err(AppError::Validation(
            "Automatic profile name must be between 1 and 100 characters.".into(),
        ));
    }
    let branch = input.branch.as_deref().unwrap_or("main").trim();
    if branch.is_empty() || branch.chars().any(char::is_whitespace) || branch.contains("..") {
        return Err(AppError::Validation("Branch name is not valid.".into()));
    }
    if let Some(time) = input.backup_time.as_deref() {
        let valid = matches!(time.split_once(':'), Some((hour, minute))
            if hour.len() == 2 && minute.len() == 2
                && hour.parse::<u8>().is_ok_and(|value| value < 24)
                && minute.parse::<u8>().is_ok_and(|value| value < 60));
        if !valid {
            return Err(AppError::Validation(
                "Backup time must be in HH:MM format.".into(),
            ));
        }
    }
    if !(5..=3600).contains(&input.change_debounce_seconds) {
        return Err(AppError::Validation(
            "Change stacking time must be between 5 seconds and 60 minutes.".into(),
        ));
    }
    if let Some(account_id) = input.integration_account_id {
        if !crate::database::integration_accounts::exists(conn, account_id)? {
            return Err(AppError::NotFound("Integration account"));
        }
    }
    if let Some(exclude_profile_id) = input.exclude_profile_id {
        if !crate::database::excludes::exists(conn, exclude_profile_id)? {
            return Err(AppError::NotFound("Exclude profile"));
        }
    }
    if let Some(ai_account_id) = input.ai_account_id {
        if !crate::database::ai_accounts::exists(conn, ai_account_id)? {
            return Err(AppError::NotFound("AI account"));
        }
    }
    if (input.ai_major_commit_messages_enabled || input.ai_fast_commit_messages_enabled)
        && input.ai_account_id.is_none()
    {
        return Err(AppError::Validation(
            "Choose an AI connection before enabling AI commit messages.".into(),
        ));
    }
    if input.auto_create_repositories && input.integration_account_id.is_none() {
        return Err(AppError::Validation(
            "Choose a Git provider account for automatic repository creation.".into(),
        ));
    }
    Ok(())
}

pub fn list(conn: &Connection) -> AppResult<Vec<AutomaticProfileRule>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {RULE_COLUMNS} FROM automatic_profile_rules ORDER BY created_at, id"
    ))?;
    let mut rules = stmt
        .query_map([], row_to_rule)?
        .collect::<Result<Vec<_>, _>>()?;
    for rule in &mut rules {
        rule.members = list_members(conn, rule.id)?;
    }
    Ok(rules)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<AutomaticProfileRule> {
    let mut rule = conn
        .query_row(
            &format!("SELECT {RULE_COLUMNS} FROM automatic_profile_rules WHERE id = ?1"),
            params![id],
            row_to_rule,
        )
        .optional()?
        .ok_or(AppError::NotFound("Automatic profile rule"))?;
    rule.members = list_members(conn, id)?;
    Ok(rule)
}

pub fn enabled_ids(conn: &Connection) -> AppResult<Vec<i64>> {
    let mut stmt = conn.prepare(
        "SELECT id FROM automatic_profile_rules WHERE enabled = 1 ORDER BY created_at, id",
    )?;
    let ids = stmt
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(ids)
}

pub fn create(
    conn: &Connection,
    input: &SaveAutomaticProfileRuleInput,
) -> AppResult<AutomaticProfileRule> {
    validate_input(conn, input)?;
    let duplicate: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM automatic_profile_rules WHERE root_path = ?1 COLLATE NOCASE)",
        params![input.root_path],
        |row| row.get(0),
    )?;
    if duplicate {
        return Err(AppError::Validation(
            "This root folder is already managed by another automatic profile.".into(),
        ));
    }
    let now = Utc::now();
    conn.execute(
        "INSERT INTO automatic_profile_rules (name, root_path, enabled, \
             integration_account_id, branch, exclude_profile_id, backup_time, \
             backup_on_startup, notifications_enabled, continuous_backup_enabled, \
             change_debounce_seconds, ai_account_id, ai_major_commit_messages_enabled, \
             ai_fast_commit_messages_enabled, auto_create_repositories, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?16)",
        params![
            input.name.trim(),
            input.root_path,
            input.enabled,
            input.integration_account_id,
            input.branch.as_deref().unwrap_or("main").trim(),
            input.exclude_profile_id,
            input.backup_time,
            input.backup_on_startup,
            input.notifications_enabled,
            input.continuous_backup_enabled,
            input.change_debounce_seconds,
            input.ai_account_id,
            input.ai_major_commit_messages_enabled,
            input.ai_fast_commit_messages_enabled,
            input.auto_create_repositories,
            now,
        ],
    )?;
    get(conn, conn.last_insert_rowid())
}

pub fn update(
    conn: &Connection,
    id: i64,
    input: &SaveAutomaticProfileRuleInput,
) -> AppResult<AutomaticProfileRule> {
    get(conn, id)?;
    validate_input(conn, input)?;
    let duplicate: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM automatic_profile_rules \
         WHERE root_path = ?1 COLLATE NOCASE AND id <> ?2)",
        params![input.root_path, id],
        |row| row.get(0),
    )?;
    if duplicate {
        return Err(AppError::Validation(
            "This root folder is already managed by another automatic profile.".into(),
        ));
    }
    conn.execute(
        "UPDATE automatic_profile_rules SET name = ?1, root_path = ?2, enabled = ?3, \
             integration_account_id = ?4, branch = ?5, exclude_profile_id = ?6, \
             backup_time = ?7, backup_on_startup = ?8, notifications_enabled = ?9, \
             continuous_backup_enabled = ?10, change_debounce_seconds = ?11, \
             ai_account_id = ?12, ai_major_commit_messages_enabled = ?13, \
             ai_fast_commit_messages_enabled = ?14, auto_create_repositories = ?15, \
             updated_at = ?16 WHERE id = ?17",
        params![
            input.name.trim(),
            input.root_path,
            input.enabled,
            input.integration_account_id,
            input.branch.as_deref().unwrap_or("main").trim(),
            input.exclude_profile_id,
            input.backup_time,
            input.backup_on_startup,
            input.notifications_enabled,
            input.continuous_backup_enabled,
            input.change_debounce_seconds,
            input.ai_account_id,
            input.ai_major_commit_messages_enabled,
            input.ai_fast_commit_messages_enabled,
            input.auto_create_repositories,
            Utc::now(),
            id,
        ],
    )?;
    get(conn, id)
}

pub fn delete(conn: &mut Connection, id: i64) -> AppResult<()> {
    get(conn, id)?;
    let now = Utc::now();
    let tx = conn.transaction()?;
    let archived_profiles = tx.execute(
        "UPDATE backup_profiles SET enabled = 0, archived_at = ?1, updated_at = ?1 \
         WHERE archived_at IS NULL AND (automatic_profile_rule_id = ?2 OR id IN (\
             SELECT profile_id FROM automatic_profile_members \
             WHERE rule_id = ?2 AND profile_id IS NOT NULL\
         ))",
        params![now, id],
    )?;
    let changed = tx.execute(
        "DELETE FROM automatic_profile_rules WHERE id = ?1",
        params![id],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound("Automatic profile rule"));
    }
    tx.commit()?;
    log::info!(
        "deleted automatic profile rule #{id} and archived {archived_profiles} generated profile(s)"
    );
    Ok(())
}

pub fn list_members(conn: &Connection, rule_id: i64) -> AppResult<Vec<AutomaticProfileMember>> {
    let mut stmt = conn.prepare(
        "SELECT id, rule_id, entry_key, entry_name, entry_kind, profile_id, source_id, source_path, \
                status, error_message, created_at, updated_at \
         FROM automatic_profile_members WHERE rule_id = ?1 \
         ORDER BY entry_kind DESC, entry_name COLLATE NOCASE, id",
    )?;
    let members = stmt
        .query_map(params![rule_id], row_to_member)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(members)
}

pub fn get_member(
    conn: &Connection,
    rule_id: i64,
    entry_key: &str,
) -> AppResult<Option<AutomaticProfileMember>> {
    Ok(conn
        .query_row(
            "SELECT id, rule_id, entry_key, entry_name, entry_kind, profile_id, source_id, source_path, \
                    status, error_message, created_at, updated_at \
             FROM automatic_profile_members WHERE rule_id = ?1 AND entry_key = ?2",
            params![rule_id, entry_key],
            row_to_member,
        )
        .optional()?)
}

pub fn insert_member(
    conn: &Connection,
    rule_id: i64,
    entry_key: &str,
    entry_name: &str,
    entry_kind: AutomaticProfileEntryKind,
    profile_id: i64,
    source_id: i64,
    source_path: &str,
) -> AppResult<AutomaticProfileMember> {
    let now = Utc::now();
    conn.execute(
        "INSERT INTO automatic_profile_members \
             (rule_id, entry_key, entry_name, entry_kind, profile_id, source_id, source_path, \
              status, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'active', ?8, ?8)",
        params![
            rule_id,
            entry_key,
            entry_name,
            entry_kind.as_str(),
            profile_id,
            source_id,
            source_path,
            now,
        ],
    )?;
    get_member(conn, rule_id, entry_key)?
        .ok_or_else(|| AppError::internal("automatic profile member disappeared after insertion"))
}

pub fn update_member(
    conn: &Connection,
    member_id: i64,
    entry_name: &str,
    entry_kind: AutomaticProfileEntryKind,
    profile_id: Option<i64>,
    source_id: Option<i64>,
    source_path: &str,
    status: AutomaticProfileMemberStatus,
    error_message: Option<&str>,
) -> AppResult<()> {
    conn.execute(
        "UPDATE automatic_profile_members SET entry_name = ?1, entry_kind = ?2, profile_id = ?3, \
             source_id = ?4, source_path = ?5, status = ?6, error_message = ?7, \
             updated_at = ?8 WHERE id = ?9",
        params![
            entry_name,
            entry_kind.as_str(),
            profile_id,
            source_id,
            source_path,
            status.as_str(),
            error_message,
            Utc::now(),
            member_id,
        ],
    )?;
    Ok(())
}

pub fn finish_reconcile(
    conn: &Connection,
    rule_id: i64,
    error_message: Option<&str>,
) -> AppResult<()> {
    conn.execute(
        "UPDATE automatic_profile_rules SET last_reconciled_at = ?1, last_error = ?2 \
         WHERE id = ?3",
        params![Utc::now(), error_message, rule_id],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;

    fn input(root_path: &str) -> SaveAutomaticProfileRuleInput {
        SaveAutomaticProfileRuleInput {
            name: "Desktop projects".into(),
            root_path: root_path.into(),
            integration_account_id: None,
            branch: Some("main".into()),
            exclude_profile_id: None,
            backup_time: Some("02:00".into()),
            backup_on_startup: true,
            notifications_enabled: true,
            continuous_backup_enabled: true,
            change_debounce_seconds: 10,
            ai_account_id: None,
            ai_major_commit_messages_enabled: false,
            ai_fast_commit_messages_enabled: false,
            auto_create_repositories: false,
            enabled: true,
        }
    }

    #[test]
    fn rule_roundtrip_and_duplicate_root_validation() {
        let db = Database::open_in_memory().unwrap();
        let first = db
            .with(|conn| create(conn, &input("C:\\Users\\User\\Desktop")))
            .unwrap();
        assert_eq!(first.name, "Desktop projects");
        assert!(first.members.is_empty());

        let duplicate = db.with(|conn| create(conn, &input("c:\\users\\user\\desktop")));
        assert!(matches!(duplicate, Err(AppError::Validation(_))));
    }

    #[test]
    fn deleting_a_rule_retires_generated_profiles_but_keeps_manual_profiles() {
        let db = Database::open_in_memory().unwrap();
        let rule = db.with(|conn| create(conn, &input("C:\\Desktop"))).unwrap();
        let profile = db
            .with(|conn| {
                crate::database::profiles::create_for_automatic_rule(
                    conn,
                    &crate::models::CreateBackupProfileInput {
                        name: "Desktop project".into(),
                        repository_owner: None,
                        repository_name: None,
                        repository_url: None,
                        branch: None,
                        integration_account_id: None,
                    },
                    rule.id,
                )
            })
            .unwrap();
        assert_eq!(profile.automatic_profile_rule_id, Some(rule.id));
        assert_eq!(
            profile.automatic_profile_rule_name.as_deref(),
            Some("Desktop projects")
        );
        let manual_profile = db
            .with(|conn| {
                crate::database::profiles::create(
                    conn,
                    &crate::models::CreateBackupProfileInput {
                        name: "Manual".into(),
                        repository_owner: None,
                        repository_name: None,
                        repository_url: None,
                        branch: None,
                        integration_account_id: None,
                    },
                )
            })
            .unwrap();
        let source = db
            .with(|conn| {
                crate::database::sources::insert_with_mode(
                    conn,
                    profile.id,
                    "C:\\Desktop\\project",
                    None,
                    crate::models::SourceScanMode::Recursive,
                )
            })
            .unwrap();
        db.with(|conn| {
            insert_member(
                conn,
                rule.id,
                "folder:project",
                "project",
                AutomaticProfileEntryKind::Directory,
                profile.id,
                source.id,
                "C:\\Desktop\\project",
            )?;
            delete(conn, rule.id)
        })
        .unwrap();

        assert!(matches!(
            db.with(|conn| crate::database::profiles::get(conn, profile.id)),
            Err(AppError::NotFound(_))
        ));
        let archived_at: Option<DateTime<Utc>> = db
            .with(|conn| {
                Ok(conn.query_row(
                    "SELECT archived_at FROM backup_profiles WHERE id = ?1",
                    params![profile.id],
                    |row| row.get(0),
                )?)
            })
            .unwrap();
        assert!(archived_at.is_some());
        let visible_sources = db
            .with(|conn| crate::database::sources::list_all(conn))
            .unwrap();
        assert!(visible_sources
            .iter()
            .all(|candidate| candidate.profile_id != profile.id));
        assert!(db
            .with(|conn| crate::database::profiles::get(conn, manual_profile.id))
            .is_ok());
    }
}
