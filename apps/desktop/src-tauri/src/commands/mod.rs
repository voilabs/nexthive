//! Tauri command handlers — thin wrappers that translate IPC calls into
//! module-level business logic. Keep them free of logic themselves.

pub mod ai;
pub mod app;
pub mod automatic_profiles;
pub mod backups;
pub mod database;
pub mod excludes;
pub mod integrations;
pub mod profiles;
pub mod sources;
pub mod updater;
