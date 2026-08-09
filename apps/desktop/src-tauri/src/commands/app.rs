use tauri::{AppHandle, Manager, PhysicalPosition, State};
use tauri_plugin_autostart::ManagerExt;

use crate::database::{app_settings, DB_FILE_NAME};
use crate::errors::{AppError, AppResult};
use crate::models::{AppInfo, AppSettings, UpdateAppSettingsInput};
use crate::state::AppState;

#[tauri::command]
pub fn get_app_info(app: AppHandle) -> AppResult<AppInfo> {
    let package = app.package_info();
    let data_dir = app.path().app_data_dir()?;
    let log_dir = app.path().app_log_dir()?;

    Ok(AppInfo {
        name: package.name.clone(),
        version: package.version.to_string(),
        tauri_version: tauri::VERSION.to_string(),
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        database_path: data_dir.join(DB_FILE_NAME).display().to_string(),
        data_dir: data_dir.display().to_string(),
        log_dir: log_dir.display().to_string(),
    })
}

#[tauri::command]
pub fn get_app_settings(app: AppHandle, state: State<'_, AppState>) -> AppResult<AppSettings> {
    let actual_autostart = app.autolaunch().is_enabled().map_err(|error| {
        log::error!("autostart status check failed: {error}");
        AppError::System("Windows startup status could not be read.".into())
    })?;
    let settings = state.db.with(|conn| app_settings::get(conn))?;
    if settings.launch_at_startup == actual_autostart {
        return Ok(settings);
    }
    state.db.with(|conn| {
        app_settings::update(
            conn,
            &UpdateAppSettingsInput {
                launch_at_startup: Some(actual_autostart),
                minimize_to_tray: None,
                theme: None,
                language: None,
                time_zone: None,
                telemetry_enabled: None,
            },
        )
    })
}

#[tauri::command]
pub fn update_app_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    input: UpdateAppSettingsInput,
) -> AppResult<AppSettings> {
    if let Some(enabled) = input.launch_at_startup {
        let manager = app.autolaunch();
        let result = if enabled {
            manager.enable()
        } else {
            manager.disable()
        };
        result.map_err(|error| {
            log::error!("could not update autostart registration: {error}");
            AppError::System(
                "Windows startup setting could not be changed. Please try again.".into(),
            )
        })?;
    }
    state.db.with(|conn| app_settings::update(conn, &input))
}

fn main_window(app: &AppHandle) -> AppResult<tauri::WebviewWindow> {
    app.get_webview_window("main")
        .ok_or(AppError::NotFound("Main window"))
}

#[tauri::command]
pub fn minimize_main_window(app: AppHandle) -> AppResult<()> {
    main_window(&app)?.minimize()?;
    Ok(())
}

#[tauri::command]
pub fn toggle_maximize_main_window(app: AppHandle) -> AppResult<()> {
    let window = main_window(&app)?;
    if window.is_maximized()? {
        window.unmaximize()?;
    } else {
        window.maximize()?;
    }
    Ok(())
}

#[tauri::command]
pub fn close_main_window(app: AppHandle) -> AppResult<()> {
    crate::tray::close_main_window(&app);
    Ok(())
}

#[tauri::command]
pub fn start_dragging_main_window(app: AppHandle) -> AppResult<()> {
    let window = main_window(&app)?;
    if window.is_maximized()? {
        let cursor = window.cursor_position()?;
        let maximized_position = window.outer_position()?;
        let maximized_size = window.outer_size()?;
        let horizontal_ratio = ((cursor.x - f64::from(maximized_position.x))
            / f64::from(maximized_size.width))
        .clamp(0.05, 0.95);
        let titlebar_offset = (cursor.y - f64::from(maximized_position.y)).clamp(0.0, 64.0);

        window.unmaximize()?;

        let restored_size = window.outer_size()?;
        window.set_position(PhysicalPosition::new(
            (cursor.x - f64::from(restored_size.width) * horizontal_ratio).round() as i32,
            (cursor.y - titlebar_offset).round() as i32,
        ))?;
    }
    window.start_dragging()?;
    Ok(())
}
