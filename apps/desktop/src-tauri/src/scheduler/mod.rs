//! Backup scheduling while the application is running.
//!
//! Supports per-profile daily times, backup-on-startup and missed daily
//! catch-up after the application (including Windows autostart) launches.

use std::collections::HashMap;
use std::time::Duration;

use chrono::{NaiveDate, NaiveTime};
use tauri::{AppHandle, Manager};

use crate::database::{app_settings, profiles, runs, settings, sources};
use crate::state::AppState;
use crate::timezone::ConfiguredTimeZone;

const TICK: Duration = Duration::from_secs(30);
const STARTUP_DELAY: Duration = Duration::from_secs(8);

/// Spawn the scheduler loop. Called once from setup.
pub fn start(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(STARTUP_DELAY).await;
        let caught_up_today = run_startup_backups(&app).await;

        // Guards against double-firing within the minute a time matches.
        let mut last_fired: HashMap<i64, NaiveDate> = HashMap::new();
        let today = configured_time_zone(&app).now().date;
        for profile_id in caught_up_today {
            last_fired.insert(profile_id, today);
        }
        loop {
            tokio::time::sleep(TICK).await;
            let clock = configured_time_zone(&app).now();
            let today = clock.date;

            for profile_id in due_profiles(&app, &clock.hhmm) {
                if last_fired.get(&profile_id) == Some(&today) {
                    continue;
                }
                last_fired.insert(profile_id, today);
                log::info!("scheduler triggering daily backup for profile #{profile_id}");
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    // Errors are already recorded on the run + emitted.
                    let _ = crate::backup::run(app, profile_id, "scheduled").await;
                });
            }
        }
    });
}

fn configured_time_zone(app: &AppHandle) -> ConfiguredTimeZone {
    let state = app.state::<AppState>();
    let preference = state
        .db
        .with(|conn| app_settings::get(conn).map(|settings| settings.time_zone));
    match preference.and_then(|value| ConfiguredTimeZone::parse(&value)) {
        Ok(time_zone) => time_zone,
        Err(error) => {
            log::error!("scheduler could not read the configured time zone: {error:?}");
            ConfiguredTimeZone::System
        }
    }
}

/// Enabled profiles whose daily time matches and that are ready to run
/// (configured repository, at least one folder, not already running).
fn due_profiles(app: &AppHandle, current_hhmm: &str) -> Vec<i64> {
    let state = app.state::<AppState>();
    let candidates = state.db.with(|conn| {
        let mut due = Vec::new();
        for entry in settings::list_enabled(conn)? {
            if entry.backup_time.as_deref() != Some(current_hhmm) {
                continue;
            }
            if is_ready(conn, entry.profile_id)? {
                due.push(entry.profile_id);
            }
        }
        Ok(due)
    });
    match candidates {
        Ok(due) => due
            .into_iter()
            .filter(|id| !state.is_backup_running(*id))
            .collect(),
        Err(error) => {
            log::error!("scheduler could not read due profiles: {error:?}");
            Vec::new()
        }
    }
}

fn is_ready(conn: &rusqlite::Connection, profile_id: i64) -> crate::errors::AppResult<bool> {
    let profile = profiles::get(conn, profile_id)?;
    if profile.repository_name.is_none() || profile.integration_account_id.is_none() {
        return Ok(false);
    }
    let has_sources = sources::list_for_profile(conn, profile_id)?
        .iter()
        .any(|source| source.enabled);
    Ok(has_sources)
}

/// Trigger every enabled, fully configured profile from a tray action.
/// Existing per-profile locks prevent duplicates with scheduled runs.
pub fn trigger_all_ready(app: AppHandle, trigger: &'static str) -> usize {
    let state = app.state::<AppState>();
    let ids = state.db.with(|conn| {
        let mut ready = Vec::new();
        for profile in profiles::list(conn)? {
            if profile.enabled && is_ready(conn, profile.id)? {
                ready.push(profile.id);
            }
        }
        Ok(ready)
    });
    let Ok(ids) = ids else {
        log::error!("tray backup action could not read profiles");
        return 0;
    };
    let ids: Vec<i64> = ids
        .into_iter()
        .filter(|id| !state.is_backup_running(*id))
        .collect();
    let count = ids.len();
    for profile_id in ids {
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            let _ = crate::backup::run(app, profile_id, trigger).await;
        });
    }
    count
}

async fn run_startup_backups(app: &AppHandle) -> Vec<i64> {
    let state = app.state::<AppState>();
    let time_zone = configured_time_zone(app);
    let clock = time_zone.now();
    let today = clock.date;
    let current_time = clock.time;
    let profiles_to_run = state.db.with(|conn| {
        let mut ready = Vec::new();
        for entry in settings::list_enabled(conn)? {
            if !is_ready(conn, entry.profile_id)? {
                continue;
            }
            let missed_daily = entry
                .backup_time
                .as_deref()
                .and_then(|value| NaiveTime::parse_from_str(value, "%H:%M").ok())
                .is_some_and(|scheduled| scheduled <= current_time)
                && runs::last_success(conn, entry.profile_id)?
                    .and_then(|run| run.completed_at)
                    .map(|completed| time_zone.date_for_utc(completed) < today)
                    .unwrap_or(true);

            if entry.backup_on_startup || missed_daily || entry.continuous_backup_enabled {
                ready.push((entry.profile_id, missed_daily, entry.backup_on_startup));
            }
        }
        Ok(ready)
    });
    match profiles_to_run {
        Ok(ready) => {
            let mut caught_up = Vec::new();
            for (profile_id, missed_daily, backup_on_startup) in ready {
                let trigger = if missed_daily {
                    "catch-up"
                } else if backup_on_startup {
                    "startup"
                } else {
                    "change-catch-up"
                };
                log::info!("running {trigger} backup for profile #{profile_id}");
                let _ = crate::backup::run(app.clone(), profile_id, trigger).await;
                if missed_daily {
                    caught_up.push(profile_id);
                }
            }
            caught_up
        }
        Err(error) => {
            log::error!("startup backup check failed: {error:?}");
            Vec::new()
        }
    }
}
