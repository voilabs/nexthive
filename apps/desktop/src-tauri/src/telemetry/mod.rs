//! Anonymous daily usage ping.
//!
//! Once per UTC day, while the app is running and the Settings → Privacy
//! switch is on, this sends exactly `{"v": <app version>, "os": <os name>}`
//! to the public counter at nexthive.app. No identifier of any kind travels
//! with the request; the server keeps day totals only. Failures are silent
//! and retried on the next interval — nothing in the app depends on this.

use std::time::Duration;

use tauri::{AppHandle, Manager};

use crate::database::app_settings;
use crate::state::AppState;

const PING_URL: &str = "https://nexthive.app/api/ping";
const STARTUP_DELAY: Duration = Duration::from_secs(90);
const CHECK_INTERVAL: Duration = Duration::from_secs(6 * 60 * 60);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);

/// Spawn the ping loop. Called once from setup.
pub fn start(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(STARTUP_DELAY).await;
        loop {
            ping_if_due(&app).await;
            tokio::time::sleep(CHECK_INTERVAL).await;
        }
    });
}

/// Send today's ping if telemetry is enabled and none was sent this UTC day.
async fn ping_if_due(app: &AppHandle) {
    let due = {
        let state = app.state::<AppState>();
        state.db.with(|conn| {
            let settings = app_settings::get(conn)?;
            if !settings.telemetry_enabled {
                return Ok(None);
            }
            let today = chrono::Utc::now().date_naive().to_string();
            let last = app_settings::telemetry_last_ping_date(conn)?;
            Ok((last.as_deref() != Some(today.as_str())).then_some(today))
        })
    };

    let today = match due {
        Ok(Some(today)) => today,
        Ok(None) => return,
        Err(error) => {
            log::warn!("telemetry state could not be read: {error:?}");
            return;
        }
    };

    let version = app.package_info().version.to_string();
    if !send_ping(&version).await {
        return; // Retried on the next interval; the date stays unset.
    }

    let state = app.state::<AppState>();
    if let Err(error) =
        state.db.with(|conn| app_settings::set_telemetry_last_ping_date(conn, &today))
    {
        log::warn!("telemetry ping date could not be stored: {error:?}");
    }
}

async fn send_ping(version: &str) -> bool {
    let client = match reqwest::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .user_agent(format!("NextHive/{version}"))
        .build()
    {
        Ok(client) => client,
        Err(error) => {
            log::warn!("telemetry client could not be built: {error}");
            return false;
        }
    };
    let body = serde_json::json!({
        "v": version,
        "os": std::env::consts::OS,
    });
    match client.post(PING_URL).json(&body).send().await {
        Ok(response) if response.status().is_success() => {
            log::info!("anonymous daily ping sent");
            true
        }
        Ok(response) => {
            log::debug!("anonymous ping rejected: HTTP {}", response.status());
            false
        }
        Err(error) => {
            log::debug!("anonymous ping not sent: {error}");
            false
        }
    }
}
