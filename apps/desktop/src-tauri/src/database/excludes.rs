//! Repository functions for exclude profiles and their rules.

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::errors::{AppError, AppResult};
use crate::models::{ExcludeProfile, ExcludeRule, ExcludeRuleKind};

fn row_to_rule(row: &Row) -> rusqlite::Result<ExcludeRule> {
    Ok(ExcludeRule {
        id: row.get("id")?,
        exclude_profile_id: row.get("exclude_profile_id")?,
        kind: ExcludeRuleKind::parse(&row.get::<_, String>("rule_kind")?).ok_or_else(|| {
            rusqlite::Error::InvalidColumnType(2, "rule_kind".into(), rusqlite::types::Type::Text)
        })?,
        pattern: row.get("pattern")?,
        enabled: row.get::<_, i64>("enabled")? != 0,
        created_at: row.get::<_, DateTime<Utc>>("created_at")?,
    })
}

fn validate_name(name: &str) -> AppResult<&str> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::Validation(
            "Exclude profile name cannot be empty.".into(),
        ));
    }
    if name.chars().count() > 60 {
        return Err(AppError::Validation(
            "Exclude profile name is too long (maximum 60 characters).".into(),
        ));
    }
    Ok(name)
}

pub fn list(conn: &Connection) -> AppResult<Vec<ExcludeProfile>> {
    let mut stmt = conn.prepare(
        "SELECT p.id, p.name, p.description, p.created_at, p.updated_at, \
                (SELECT COUNT(*) FROM backup_sources s WHERE s.exclude_profile_id = p.id) AS used_by \
         FROM exclude_profiles p ORDER BY p.name COLLATE NOCASE, p.id",
    )?;
    let mut profiles = stmt
        .query_map([], |row| {
            Ok(ExcludeProfile {
                id: row.get("id")?,
                name: row.get("name")?,
                description: row.get("description")?,
                created_at: row.get::<_, DateTime<Utc>>("created_at")?,
                updated_at: row.get::<_, DateTime<Utc>>("updated_at")?,
                used_by: row.get("used_by")?,
                rules: Vec::new(),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut rules_stmt = conn.prepare(
        "SELECT id, exclude_profile_id, rule_kind, pattern, enabled, created_at \
         FROM exclude_rules ORDER BY created_at, id",
    )?;
    let rules = rules_stmt
        .query_map([], row_to_rule)?
        .collect::<Result<Vec<_>, _>>()?;
    for rule in rules {
        if let Some(profile) = profiles
            .iter_mut()
            .find(|p| p.id == rule.exclude_profile_id)
        {
            profile.rules.push(rule);
        }
    }
    Ok(profiles)
}

pub fn exists(conn: &Connection, id: i64) -> AppResult<bool> {
    let found: Option<i64> = conn
        .query_row(
            "SELECT 1 FROM exclude_profiles WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .optional()?;
    Ok(found.is_some())
}

pub fn create(conn: &Connection, name: &str, description: Option<&str>) -> AppResult<()> {
    let name = validate_name(name)?;
    conn.execute(
        "INSERT INTO exclude_profiles (name, description, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?3)",
        params![
            name,
            description.map(str::trim).filter(|d| !d.is_empty()),
            Utc::now(),
        ],
    )?;
    Ok(())
}

pub fn update(
    conn: &Connection,
    id: i64,
    name: Option<&str>,
    description: Option<&str>,
) -> AppResult<()> {
    if !exists(conn, id)? {
        return Err(AppError::NotFound("Exclude profile"));
    }
    if let Some(name) = name {
        let name = validate_name(name)?;
        conn.execute(
            "UPDATE exclude_profiles SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![name, Utc::now(), id],
        )?;
    }
    if let Some(description) = description {
        let description = Some(description.trim()).filter(|d| !d.is_empty());
        conn.execute(
            "UPDATE exclude_profiles SET description = ?1, updated_at = ?2 WHERE id = ?3",
            params![description, Utc::now(), id],
        )?;
    }
    Ok(())
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    let changed = conn.execute("DELETE FROM exclude_profiles WHERE id = ?1", params![id])?;
    if changed == 0 {
        return Err(AppError::NotFound("Exclude profile"));
    }
    Ok(())
}

pub fn add_rule(conn: &Connection, profile_id: i64, pattern: &str) -> AppResult<()> {
    add_rule_with_kind(conn, profile_id, ExcludeRuleKind::Glob, pattern)
}

pub fn add_rule_with_kind(
    conn: &Connection,
    profile_id: i64,
    kind: ExcludeRuleKind,
    pattern: &str,
) -> AppResult<()> {
    if !exists(conn, profile_id)? {
        return Err(AppError::NotFound("Exclude profile"));
    }
    let duplicate: Option<i64> = conn
        .query_row(
            "SELECT id FROM exclude_rules \
             WHERE exclude_profile_id = ?1 AND rule_kind = ?2 \
               AND pattern = ?3 COLLATE NOCASE",
            params![profile_id, kind.as_str(), pattern],
            |row| row.get(0),
        )
        .optional()?;
    if duplicate.is_some() {
        if kind == ExcludeRuleKind::Exact {
            return Ok(());
        }
        return Err(AppError::Validation(
            "This exclude rule already exists in the profile.".into(),
        ));
    }
    conn.execute(
        "INSERT INTO exclude_rules \
             (exclude_profile_id, rule_kind, pattern, created_at) \
         VALUES (?1, ?2, ?3, ?4)",
        params![profile_id, kind.as_str(), pattern, Utc::now()],
    )?;
    Ok(())
}

pub fn set_rule_enabled(conn: &Connection, rule_id: i64, enabled: bool) -> AppResult<()> {
    let changed = conn.execute(
        "UPDATE exclude_rules SET enabled = ?1 WHERE id = ?2",
        params![enabled, rule_id],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound("Exclude rule"));
    }
    Ok(())
}

pub fn delete_rule(conn: &Connection, rule_id: i64) -> AppResult<()> {
    let changed = conn.execute("DELETE FROM exclude_rules WHERE id = ?1", params![rule_id])?;
    if changed == 0 {
        return Err(AppError::NotFound("Exclude rule"));
    }
    Ok(())
}

/// Enabled patterns applying to a backup source (via its assigned exclude
/// profile). Empty when the source has none.
pub fn rules_for_source(
    conn: &Connection,
    source_id: i64,
) -> AppResult<Vec<(ExcludeRuleKind, String)>> {
    let mut stmt = conn.prepare(
        "SELECT r.rule_kind, r.pattern FROM exclude_rules r \
         JOIN backup_sources s ON s.exclude_profile_id = r.exclude_profile_id \
         WHERE s.id = ?1 AND r.enabled = 1",
    )?;
    let patterns = stmt
        .query_map(params![source_id], |row| {
            let raw: String = row.get(0)?;
            let kind = ExcludeRuleKind::parse(&raw).ok_or_else(|| {
                rusqlite::Error::InvalidColumnType(
                    0,
                    "rule_kind".into(),
                    rusqlite::types::Type::Text,
                )
            })?;
            Ok((kind, row.get::<_, String>(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(patterns)
}
