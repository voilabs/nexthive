//! NextHive — local-first backup manager.
//!
//! This file only wires up Tauri: plugins, shared state and command
//! registration. Business logic lives in the dedicated modules.

pub mod ai;
pub mod automatic_profiles;
pub mod backup;
pub mod change_watcher;
pub mod commands;
pub mod credentials;
pub mod database;
pub mod errors;
pub mod git;
pub mod github;
pub mod integrations;
pub mod models;
pub mod scanner;
pub mod scheduler;
pub mod state;
pub mod telemetry;
pub mod timezone;
pub mod tray;
pub mod updater;

use tauri::Manager;
use tauri_plugin_log::{RotationStrategy, Target, TargetKind};

use crate::database::Database;
use crate::state::AppState;

const MAX_LOG_FILE_SIZE: u128 = 2 * 1024 * 1024;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                ])
                .max_file_size(MAX_LOG_FILE_SIZE)
                .rotation_strategy(RotationStrategy::KeepAll)
                .build(),
        )
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            let db = Database::open(&data_dir.join(database::DB_FILE_NAME))?;
            db.with(|conn| database::runs::fail_stale_running(conn))?;
            app.manage(AppState::new(db));
            app.manage(updater::UpdateState::default());
            tray::setup(app)?;
            scheduler::start(app.handle().clone());
            change_watcher::start(app.handle().clone());
            automatic_profiles::start(app.handle().clone());
            telemetry::start(app.handle().clone());
            let started_minimized = std::env::args_os().any(|arg| arg == "--minimized");
            if started_minimized {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
                log::info!("NextHive started in the notification area");
            } else {
                tray::show_main_window(app.handle());
            }
            log::info!("NextHive initialized");
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let app = window.app_handle();
                let state = app.state::<AppState>();
                if state.is_quitting() {
                    return;
                }
                api.prevent_close();
                tray::close_main_window(app);
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::app::get_app_info,
            commands::app::get_app_settings,
            commands::app::update_app_settings,
            commands::app::minimize_main_window,
            commands::app::toggle_maximize_main_window,
            commands::app::close_main_window,
            commands::app::start_dragging_main_window,
            commands::database::get_database_health,
            commands::database::repair_database,
            commands::updater::check_for_app_update,
            commands::updater::install_app_update,
            commands::profiles::list_backup_profiles,
            commands::profiles::create_backup_profile,
            commands::profiles::update_backup_profile,
            commands::profiles::delete_backup_profile,
            commands::profiles::create_profile_repository,
            commands::automatic_profiles::list_automatic_profile_rules,
            commands::automatic_profiles::create_automatic_profile_rule,
            commands::automatic_profiles::update_automatic_profile_rule,
            commands::automatic_profiles::sync_automatic_profile_rule,
            commands::automatic_profiles::delete_automatic_profile_rule,
            commands::sources::list_backup_sources,
            commands::sources::add_backup_source,
            commands::sources::remove_backup_source,
            commands::integrations::list_integration_accounts,
            commands::integrations::list_integration_repositories,
            commands::integrations::add_integration_token_account,
            commands::integrations::add_integration_ssh_account,
            commands::integrations::test_integration_connection,
            commands::integrations::remove_integration_account,
            commands::integrations::get_integration_ssh_public_key,
            commands::ai::list_ai_provider_accounts,
            commands::ai::add_ai_provider_account,
            commands::ai::test_ai_provider_connection,
            commands::ai::remove_ai_provider_account,
            commands::backups::run_manual_backup,
            commands::backups::list_backup_runs,
            commands::backups::get_backup_settings,
            commands::backups::update_backup_settings,
            commands::excludes::list_exclude_profiles,
            commands::excludes::create_exclude_profile,
            commands::excludes::update_exclude_profile,
            commands::excludes::delete_exclude_profile,
            commands::excludes::add_exclude_rule,
            commands::excludes::set_exclude_rule_enabled,
            commands::excludes::delete_exclude_rule,
            commands::excludes::set_source_exclude_profile,
            commands::excludes::exclude_backup_file,
        ])
        .run(tauri::generate_context!())
        .expect("failed to start NextHive");
}
