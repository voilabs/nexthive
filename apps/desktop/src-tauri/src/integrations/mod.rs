//! Git hosting integrations. Provider-specific API details stay behind a
//! small shared account/repository interface so backup orchestration does not
//! depend on one vendor.

pub mod accounts;
pub mod provider_api;
pub mod repositories;
