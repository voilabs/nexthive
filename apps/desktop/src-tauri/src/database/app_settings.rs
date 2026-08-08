//! Singleton application-level preferences.

use chrono::Utc;
use rusqlite::{params, Connection};

use crate::errors::{AppError, AppResult};
use crate::models::{validate_language, AppSettings, AppTheme, UpdateAppSettingsInput};

pub fn get(conn: &Connection) -> AppResult<AppSettings> {
    conn.query_row(
        "SELECT launch_at_startup, minimize_to_tray, theme, language, time_zone, \
                telemetry_enabled \
         FROM app_settings WHERE id = 1",
        [],
        |row| {
            Ok(AppSettings {
                launch_at_startup: row.get::<_, i64>(0)? != 0,
                minimize_to_tray: row.get::<_, i64>(1)? != 0,
                theme: AppTheme::parse(&row.get::<_, String>(2)?).ok_or_else(|| {
                    rusqlite::Error::InvalidColumnType(
                        2,
                        "theme".into(),
                        rusqlite::types::Type::Text,
                    )
                })?,
                language: row.get(3)?,
                time_zone: row.get(4)?,
                telemetry_enabled: row.get::<_, i64>(5)? != 0,
            })
        },
    )
    .map_err(Into::into)
}

/// UTC day ("YYYY-MM-DD") of the last successful anonymous ping, if any.
pub fn telemetry_last_ping_date(conn: &Connection) -> AppResult<Option<String>> {
    conn.query_row(
        "SELECT telemetry_last_ping_date FROM app_settings WHERE id = 1",
        [],
        |row| row.get(0),
    )
    .map_err(Into::into)
}

pub fn set_telemetry_last_ping_date(conn: &Connection, date: &str) -> AppResult<()> {
    conn.execute(
        "UPDATE app_settings SET telemetry_last_ping_date = ?1, updated_at = ?2 WHERE id = 1",
        params![date, Utc::now()],
    )?;
    Ok(())
}

pub fn update(conn: &Connection, input: &UpdateAppSettingsInput) -> AppResult<AppSettings> {
    let current = get(conn)?;
    let time_zone = input.time_zone.as_deref().unwrap_or(&current.time_zone);
    crate::timezone::ConfiguredTimeZone::parse(time_zone)?;
    let language = input.language.as_deref().unwrap_or(&current.language);
    if !validate_language(language) {
        return Err(AppError::Validation(
            "The selected language is not a valid language tag.".into(),
        ));
    }
    conn.execute(
        "UPDATE app_settings SET launch_at_startup = ?1, minimize_to_tray = ?2, \
         theme = ?3, language = ?4, time_zone = ?5, telemetry_enabled = ?6, \
         updated_at = ?7 WHERE id = 1",
        params![
            input.launch_at_startup.unwrap_or(current.launch_at_startup),
            input.minimize_to_tray.unwrap_or(current.minimize_to_tray),
            input.theme.unwrap_or(current.theme).as_str(),
            language,
            time_zone,
            input.telemetry_enabled.unwrap_or(current.telemetry_enabled),
            Utc::now(),
        ],
    )?;
    get(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;

    #[test]
    fn defaults_to_close_to_tray_and_updates_independently() {
        let db = Database::open_in_memory().unwrap();
        let defaults = db.with(|conn| get(conn)).unwrap();
        assert!(!defaults.launch_at_startup);
        assert!(defaults.minimize_to_tray);
        assert!(defaults.telemetry_enabled);

        let updated = db
            .with(|conn| {
                update(
                    conn,
                    &UpdateAppSettingsInput {
                        launch_at_startup: Some(true),
                        minimize_to_tray: None,
                        theme: Some(AppTheme::Dark),
                        language: Some("tr".into()),
                        time_zone: Some("UTC+03:00".into()),
                        telemetry_enabled: Some(false),
                    },
                )
            })
            .unwrap();
        assert!(updated.launch_at_startup);
        assert!(updated.minimize_to_tray);
        assert_eq!(updated.theme, AppTheme::Dark);
        assert_eq!(updated.language, "tr");
        assert_eq!(updated.time_zone, "UTC+03:00");
        assert!(!updated.telemetry_enabled);
    }
}
