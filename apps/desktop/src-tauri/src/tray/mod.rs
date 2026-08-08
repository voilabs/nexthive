//! Windows notification-area integration and close-to-tray behavior.

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, Runtime};

use crate::database::runs;
use crate::models::BackupRunStatus;
use crate::state::AppState;
use crate::timezone::ConfiguredTimeZone;

pub const TRAY_ID: &str = "nexthive-tray";

pub fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn close_main_window<R: Runtime>(app: &AppHandle<R>) {
    let state = app.state::<AppState>();
    let minimize_to_tray = state
        .db
        .with(|conn| crate::database::app_settings::get(conn))
        .map(|settings| settings.minimize_to_tray)
        .unwrap_or(true);
    if minimize_to_tray {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.hide();
        }
        log::info!("main window hidden in notification area");
    } else {
        state.request_quit();
        app.exit(0);
    }
}

fn last_backup_text<R: Runtime>(app: &AppHandle<R>) -> String {
    let state = app.state::<AppState>();
    let time_zone = state
        .db
        .with(|conn| crate::database::app_settings::get(conn))
        .ok()
        .and_then(|settings| ConfiguredTimeZone::parse(&settings.time_zone).ok())
        .unwrap_or(ConfiguredTimeZone::System);
    let latest = state.db.with(|conn| runs::list(conn, None, 1));
    let Ok(mut latest) = latest else {
        return "Last backup: unavailable".into();
    };
    let Some(run) = latest.pop() else {
        return "Last backup: never".into();
    };
    let status = match run.status {
        BackupRunStatus::Success => "Successful",
        BackupRunStatus::Failed => "Failed",
        BackupRunStatus::Running => "Running",
        BackupRunStatus::Cancelled => "Cancelled",
    };
    let when = time_zone.format_for_tray(run.completed_at.unwrap_or(run.started_at));
    format!("Last backup: {status} · {when}")
}

pub fn setup(app: &tauri::App) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open NextHive", true, None::<&str>)?;
    let status = MenuItem::with_id(app, "status", "NextHive is running", false, None::<&str>)?;
    let last_backup = MenuItem::with_id(
        app,
        "last-backup",
        last_backup_text(app.handle()),
        false,
        None::<&str>,
    )?;
    let backup_now = MenuItem::with_id(app, "backup-now", "Back Up Now", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let separator_before_actions = PredefinedMenuItem::separator(app)?;
    let separator_before_quit = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit NextHive", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &open,
            &status,
            &last_backup,
            &separator_before_actions,
            &backup_now,
            &settings,
            &separator_before_quit,
            &quit,
        ],
    )?;

    let last_backup_on_click = last_backup.clone();
    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .tooltip("NextHive — Backup Manager")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_main_window(app),
            "settings" => {
                show_main_window(app);
                let _ = app.emit("app-navigate", "/settings");
            }
            "backup-now" => {
                let count = crate::scheduler::trigger_all_ready(app.clone(), "tray");
                log::info!("tray requested backup for {count} ready profile(s)");
            }
            "quit" => {
                app.state::<AppState>().request_quit();
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(move |tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            }
            | TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } => show_main_window(tray.app_handle()),
            TrayIconEvent::Click {
                button: MouseButton::Right,
                button_state: MouseButtonState::Down,
                ..
            } => {
                let _ = last_backup_on_click.set_text(last_backup_text(tray.app_handle()));
            }
            _ => {}
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}
