//! Signed application update checks and installation.
//!
//! Update artifacts are verified by Tauri against the public key embedded in
//! `tauri.conf.json`. The matching private key is used only by release CI.

use std::sync::Mutex;
use std::time::Duration;

use serde::Serialize;
use tauri::{ipc::Channel, AppHandle};
use tauri_plugin_updater::{Update, UpdaterExt};

use crate::errors::{AppError, AppResult};
use crate::models::AppUpdate;

const UPDATE_TIMEOUT: Duration = Duration::from_secs(30);

pub struct UpdateState {
    pending: Mutex<Option<Update>>,
    operation: tokio::sync::Mutex<()>,
}

impl Default for UpdateState {
    fn default() -> Self {
        Self {
            pending: Mutex::new(None),
            operation: tokio::sync::Mutex::new(()),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "event", content = "data", rename_all = "camelCase")]
pub enum UpdateProgressEvent {
    Started {
        #[serde(rename = "contentLength")]
        content_length: Option<u64>,
    },
    Progress {
        #[serde(rename = "chunkLength")]
        chunk_length: usize,
    },
    Finished,
}

pub async fn check(app: &AppHandle, state: &UpdateState) -> AppResult<Option<AppUpdate>> {
    let _operation = state.operation.lock().await;
    let update = app
        .updater_builder()
        .timeout(UPDATE_TIMEOUT)
        .build()
        .map_err(|error| {
            AppError::update(
                "NextHive could not prepare the update check.",
                error.to_string(),
            )
        })?
        .check()
        .await
        .map_err(|error| {
            AppError::update(
                "Updates could not be checked. Check your internet connection and try again.",
                error.to_string(),
            )
        })?;

    let metadata = update.as_ref().map(|update| AppUpdate {
        version: update.version.clone(),
        current_version: update.current_version.clone(),
        notes: update.body.clone(),
        published_at: update.date.map(|date| date.to_string()),
    });

    *state
        .pending
        .lock()
        .map_err(|_| AppError::internal("pending update lock poisoned"))? = update;

    Ok(metadata)
}

pub async fn install(
    app: &AppHandle,
    state: &UpdateState,
    on_event: Channel<UpdateProgressEvent>,
) -> AppResult<()> {
    let _operation = state.operation.lock().await;
    let update = state
        .pending
        .lock()
        .map_err(|_| AppError::internal("pending update lock poisoned"))?
        .take()
        .ok_or_else(|| AppError::Validation("Check for an update before installing it.".into()))?;

    let mut started = false;
    update
        .download_and_install(
            |chunk_length, content_length| {
                if !started {
                    started = true;
                    let _ = on_event.send(UpdateProgressEvent::Started { content_length });
                }
                let _ = on_event.send(UpdateProgressEvent::Progress { chunk_length });
            },
            || {
                let _ = on_event.send(UpdateProgressEvent::Finished);
            },
        )
        .await
        .map_err(|error| {
            AppError::update(
                "The update could not be downloaded or installed. NextHive was not updated.",
                error.to_string(),
            )
        })?;

    log::info!("application update installed; restarting NextHive");
    app.restart();
}
