use tauri::State;

use crate::database::{excludes, sources};
use crate::errors::AppError;
use crate::errors::AppResult;
use crate::models::{BackupSource, ExcludeProfile, ExcludeRuleKind};
use crate::scanner::excludes as matcher;
use crate::state::AppState;

#[tauri::command]
pub fn list_exclude_profiles(state: State<'_, AppState>) -> AppResult<Vec<ExcludeProfile>> {
    state.db.with(|conn| excludes::list(conn))
}

#[tauri::command]
pub fn create_exclude_profile(
    state: State<'_, AppState>,
    name: String,
    description: Option<String>,
) -> AppResult<Vec<ExcludeProfile>> {
    state.db.with(|conn| {
        excludes::create(conn, &name, description.as_deref())?;
        excludes::list(conn)
    })
}

#[tauri::command]
pub fn update_exclude_profile(
    state: State<'_, AppState>,
    id: i64,
    name: Option<String>,
    description: Option<String>,
) -> AppResult<Vec<ExcludeProfile>> {
    state.db.with(|conn| {
        excludes::update(conn, id, name.as_deref(), description.as_deref())?;
        excludes::list(conn)
    })
}

#[tauri::command]
pub fn delete_exclude_profile(
    state: State<'_, AppState>,
    id: i64,
) -> AppResult<Vec<ExcludeProfile>> {
    state.db.with(|conn| {
        excludes::delete(conn, id)?;
        excludes::list(conn)
    })
}

#[tauri::command]
pub fn add_exclude_rule(
    state: State<'_, AppState>,
    profile_id: i64,
    pattern: String,
) -> AppResult<Vec<ExcludeProfile>> {
    let pattern = pattern.trim().to_string();
    matcher::validate_pattern(&pattern)?;
    state.db.with(|conn| {
        excludes::add_rule(conn, profile_id, &pattern)?;
        excludes::list(conn)
    })
}

#[tauri::command]
pub fn set_exclude_rule_enabled(
    state: State<'_, AppState>,
    rule_id: i64,
    enabled: bool,
) -> AppResult<Vec<ExcludeProfile>> {
    state.db.with(|conn| {
        excludes::set_rule_enabled(conn, rule_id, enabled)?;
        excludes::list(conn)
    })
}

#[tauri::command]
pub fn delete_exclude_rule(
    state: State<'_, AppState>,
    rule_id: i64,
) -> AppResult<Vec<ExcludeProfile>> {
    state.db.with(|conn| {
        excludes::delete_rule(conn, rule_id)?;
        excludes::list(conn)
    })
}

#[tauri::command]
pub fn set_source_exclude_profile(
    state: State<'_, AppState>,
    source_id: i64,
    exclude_profile_id: Option<i64>,
) -> AppResult<BackupSource> {
    state
        .db
        .with(|conn| sources::set_exclude_profile(conn, source_id, exclude_profile_id))
}

#[tauri::command]
pub fn exclude_backup_file(
    state: State<'_, AppState>,
    source_id: i64,
    relative_path: String,
) -> AppResult<Vec<ExcludeProfile>> {
    let relative_path = relative_path.trim().replace('\\', "/");
    if relative_path.is_empty()
        || relative_path.starts_with('/')
        || relative_path
            .split('/')
            .any(|part| part.is_empty() || part == "." || part == "..")
        || relative_path.len() > 4096
    {
        return Err(AppError::Validation(
            "The reported file path is not safe to exclude.".into(),
        ));
    }

    state.db.with(|conn| {
        let tx = conn.unchecked_transaction()?;
        let source = sources::get(&tx, source_id)?;
        let exclude_profile_id = if let Some(id) = source.exclude_profile_id {
            id
        } else {
            excludes::create(
                &tx,
                &format!("Backup issues (folder {})", source.id),
                Some("Files explicitly excluded after a backup problem."),
            )?;
            let id = tx.last_insert_rowid();
            sources::set_exclude_profile(&tx, source.id, Some(id))?;
            id
        };
        excludes::add_rule_with_kind(
            &tx,
            exclude_profile_id,
            ExcludeRuleKind::Exact,
            &relative_path,
        )?;
        tx.commit()?;
        excludes::list(conn)
    })
}
