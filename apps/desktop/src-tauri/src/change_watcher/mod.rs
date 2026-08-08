//! Native filesystem change detection for continuous backups.
//!
//! OS events are deliberately treated as hints: bursts are stacked per
//! profile, then the normal scanner/database diff remains authoritative.
//! This avoids hashing every file repeatedly and safely catches coalesced,
//! duplicated or missed watcher events on the next startup scan.

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Manager};
use tokio::sync::mpsc;
use tokio::time::{Instant, MissedTickBehavior};

use crate::database::{excludes, profiles, settings, sources};
use crate::errors::AppResult;
use crate::models::SourceScanMode;
use crate::scanner;
use crate::scanner::excludes::ExcludeMatcher;
use crate::state::AppState;

const CONFIG_REFRESH: Duration = Duration::from_secs(3);
const BUSY_RETRY: Duration = Duration::from_secs(2);
const EVENT_BUFFER: usize = 4096;

struct WatchedSource {
    profile_id: i64,
    source_id: i64,
    root: PathBuf,
    exclude: Option<ExcludeMatcher>,
    scan_mode: SourceScanMode,
}

#[derive(Default)]
struct WatchConfiguration {
    sources: Vec<WatchedSource>,
    debounce_by_profile: HashMap<i64, Duration>,
}

struct PendingBackup {
    due_at: Instant,
    stacked_events: usize,
    change_hints: crate::backup::ChangeHints,
}

pub fn start(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        if let Err(error) = run(app).await {
            log::error!("continuous backup watcher stopped: {error:?}");
        }
    });
}

async fn run(app: AppHandle) -> AppResult<()> {
    let protected_data_dir = app.path().app_data_dir()?;
    let (event_tx, mut event_rx) = mpsc::channel(EVENT_BUFFER);
    let overflowed = Arc::new(AtomicBool::new(false));
    let callback_overflowed = overflowed.clone();
    let mut watcher = notify::recommended_watcher(move |event| {
        if event_tx.try_send(event).is_err() {
            callback_overflowed.store(true, Ordering::Release);
        }
    })
    .map_err(|error| crate::errors::AppError::internal(format!("watcher init: {error}")))?;

    let mut configuration = WatchConfiguration::default();
    let mut watched_roots = HashSet::new();
    refresh_configuration(&app, &mut watcher, &mut watched_roots, &mut configuration);

    let mut pending: HashMap<i64, PendingBackup> = HashMap::new();
    let mut refresh = tokio::time::interval(CONFIG_REFRESH);
    refresh.set_missed_tick_behavior(MissedTickBehavior::Skip);
    // The initial configuration was loaded synchronously above.
    refresh.tick().await;
    let mut due_check = tokio::time::interval(Duration::from_secs(1));
    due_check.set_missed_tick_behavior(MissedTickBehavior::Skip);

    loop {
        tokio::select! {
            maybe_event = event_rx.recv() => {
                let Some(event) = maybe_event else {
                    return Ok(());
                };
                match event {
                    Ok(event) => stack_event(
                        &configuration,
                        &protected_data_dir,
                        event,
                        &mut pending,
                    ),
                    Err(_) => {
                        log::warn!("the operating system dropped a filesystem watcher event; all continuous profiles were queued for a safety scan");
                        stack_all_profiles(&configuration, &mut pending);
                    }
                }
            }
            _ = refresh.tick() => {
                refresh_configuration(
                    &app,
                    &mut watcher,
                    &mut watched_roots,
                    &mut configuration,
                );
                pending.retain(|profile_id, _| {
                    configuration.debounce_by_profile.contains_key(profile_id)
                });
            }
            _ = due_check.tick() => {
                if overflowed.swap(false, Ordering::AcqRel) {
                    log::warn!("filesystem events exceeded the watcher buffer; all continuous profiles were queued for a safety scan");
                    stack_all_profiles(&configuration, &mut pending);
                }
                dispatch_due_backups(&app, &configuration, &mut pending);
            }
        }
    }
}

fn stack_all_profiles(
    configuration: &WatchConfiguration,
    pending: &mut HashMap<i64, PendingBackup>,
) {
    let now = Instant::now();
    for (profile_id, debounce) in &configuration.debounce_by_profile {
        let entry = pending.entry(*profile_id).or_insert(PendingBackup {
            due_at: now + *debounce,
            stacked_events: 0,
            change_hints: HashMap::new(),
        });
        entry.due_at = now + *debounce;
        entry.stacked_events = entry.stacked_events.saturating_add(1);
        for source in configuration
            .sources
            .iter()
            .filter(|source| source.profile_id == *profile_id)
        {
            entry
                .change_hints
                .entry(source.source_id)
                .or_default()
                .insert(crate::backup::FORCE_HASH_ALL.to_string());
        }
    }
}

fn load_configuration(app: &AppHandle) -> AppResult<WatchConfiguration> {
    let state = app.state::<AppState>();
    state.db.with(|conn| {
        let mut enabled_settings = HashMap::new();
        for entry in settings::list_enabled(conn)? {
            if !entry.continuous_backup_enabled {
                continue;
            }
            let profile = profiles::get(conn, entry.profile_id)?;
            if profile.repository_name.is_some() && profile.integration_account_id.is_some() {
                enabled_settings.insert(entry.profile_id, entry.change_debounce_seconds);
            }
        }

        let mut watched_sources = Vec::new();
        for source in sources::list_all(conn)? {
            if !source.enabled || !enabled_settings.contains_key(&source.profile_id) {
                continue;
            }
            let rules = excludes::rules_for_source(conn, source.id)?;
            let exclude = if rules.is_empty() {
                None
            } else {
                Some(scanner::excludes::build_rules_matcher(&rules)?)
            };
            watched_sources.push(WatchedSource {
                profile_id: source.profile_id,
                source_id: source.id,
                root: PathBuf::from(source.path),
                exclude,
                scan_mode: source.scan_mode,
            });
        }

        Ok(WatchConfiguration {
            sources: watched_sources,
            debounce_by_profile: enabled_settings
                .into_iter()
                .map(|(profile_id, seconds)| (profile_id, Duration::from_secs(u64::from(seconds))))
                .collect(),
        })
    })
}

fn refresh_configuration(
    app: &AppHandle,
    watcher: &mut RecommendedWatcher,
    watched_roots: &mut HashSet<PathBuf>,
    configuration: &mut WatchConfiguration,
) {
    let next = match load_configuration(app) {
        Ok(next) => next,
        Err(error) => {
            log::error!("continuous backup configuration could not be refreshed: {error:?}");
            return;
        }
    };
    let requested_roots = next
        .sources
        .iter()
        .map(|source| source.root.clone())
        .collect::<HashSet<_>>();

    for root in watched_roots.difference(&requested_roots) {
        if watcher.unwatch(root).is_err() {
            log::warn!("an obsolete continuous backup folder could not be unwatched");
        }
    }

    let mut active_roots = watched_roots
        .intersection(&requested_roots)
        .cloned()
        .collect::<HashSet<_>>();
    for root in requested_roots.difference(watched_roots) {
        if !root.is_dir() {
            continue;
        }
        match watcher.watch(root, RecursiveMode::Recursive) {
            Ok(()) => {
                active_roots.insert(root.clone());
            }
            Err(_) => {
                let source_ids = next
                    .sources
                    .iter()
                    .filter(|source| source.root == *root)
                    .map(|source| source.source_id.to_string())
                    .collect::<Vec<_>>()
                    .join(",");
                log::warn!("source(s) #{source_ids} could not be watched for changes");
            }
        }
    }

    if active_roots != *watched_roots {
        log::info!(
            "continuous backup watcher now monitors {} source folder(s)",
            active_roots.len()
        );
    }
    *watched_roots = active_roots;
    *configuration = next;
}

fn stack_event(
    configuration: &WatchConfiguration,
    protected_data_dir: &Path,
    event: Event,
    pending: &mut HashMap<i64, PendingBackup>,
) {
    if matches!(event.kind, EventKind::Access(_)) {
        return;
    }

    let mut affected_profiles: HashMap<i64, crate::backup::ChangeHints> = HashMap::new();
    for path in event.paths {
        if path.starts_with(protected_data_dir) {
            continue;
        }
        for source in &configuration.sources {
            if event_matches_source(&path, source) {
                let hints = affected_profiles.entry(source.profile_id).or_default();
                if let Some(relative) = scanner::relative_slash_path(&source.root, &path) {
                    hints.entry(source.source_id).or_default().insert(relative);
                }
            }
        }
    }

    let now = Instant::now();
    for (profile_id, change_hints) in affected_profiles {
        let Some(debounce) = configuration.debounce_by_profile.get(&profile_id) else {
            continue;
        };
        let entry = pending.entry(profile_id).or_insert(PendingBackup {
            due_at: now + *debounce,
            stacked_events: 0,
            change_hints: HashMap::new(),
        });
        entry.due_at = now + *debounce;
        entry.stacked_events = entry.stacked_events.saturating_add(1);
        for (source_id, paths) in change_hints {
            entry
                .change_hints
                .entry(source_id)
                .or_default()
                .extend(paths);
        }
    }
}

fn event_matches_source(path: &Path, source: &WatchedSource) -> bool {
    if !path.starts_with(&source.root) {
        return false;
    }
    let Some(relative) = scanner::relative_slash_path(&source.root, path) else {
        return true;
    };
    if source.scan_mode == SourceScanMode::DirectFiles && relative.contains('/') {
        return false;
    }
    if scanner::is_default_ignored_relative(&relative) {
        return false;
    }
    !source
        .exclude
        .as_ref()
        .is_some_and(|matcher| matcher.is_match(&relative))
}

fn dispatch_due_backups(
    app: &AppHandle,
    configuration: &WatchConfiguration,
    pending: &mut HashMap<i64, PendingBackup>,
) {
    let now = Instant::now();
    let state = app.state::<AppState>();
    let due = pending
        .iter()
        .filter(|(profile_id, pending)| {
            pending.due_at <= now && configuration.debounce_by_profile.contains_key(profile_id)
        })
        .map(|(profile_id, _)| *profile_id)
        .collect::<Vec<_>>();

    for profile_id in due {
        if state.is_backup_running(profile_id) {
            if let Some(pending) = pending.get_mut(&profile_id) {
                pending.due_at = now + BUSY_RETRY;
            }
            continue;
        }
        let Some(stacked) = pending.remove(&profile_id) else {
            continue;
        };
        log::info!(
            "continuous backup dispatching profile #{profile_id} after stacking {} filesystem event(s)",
            stacked.stacked_events
        );
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            if let Err(error) =
                crate::backup::run_continuous(app, profile_id, stacked.change_hints).await
            {
                log::error!("continuous backup failed for profile #{profile_id}: {error:?}");
            }
        });
    }
}
