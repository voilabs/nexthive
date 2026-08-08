//! AI-assisted commit messages.
//!
//! Provider credentials stay in the OS vault. Requests contain only backup
//! counts and a bounded list of repository-relative paths; file contents and
//! source absolute paths never leave the machine.

pub mod accounts;
pub mod commit_message;
mod provider;
