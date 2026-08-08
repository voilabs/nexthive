//! GitHub-specific REST API and Git LFS transport used by the provider layer.
//!
//! Tokens come exclusively from the credential store and are only ever
//! sent as request headers — never logged, persisted to SQLite or
//! returned to the frontend.

pub mod api;
pub mod lfs;
