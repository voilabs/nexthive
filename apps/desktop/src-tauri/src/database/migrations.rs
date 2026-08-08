//! Versioned schema migrations tracked via `PRAGMA user_version`.
//!
//! Append new migrations to [`MIGRATIONS`]; never edit an entry that has
//! shipped. Each migration runs exactly once, inside its own transaction.

use rusqlite::Connection;

use crate::errors::AppResult;

const MIGRATIONS: &[&str] = &[
    V1_INITIAL_SCHEMA,
    V2_GITHUB_ACCOUNTS,
    V3_EXCLUDE_PROFILES,
    V4_APP_SETTINGS,
    V5_THEME_AND_EXACT_EXCLUDES,
    V6_GIT_PROVIDERS,
    V7_LANGUAGE_AND_TIME_ZONE,
    V8_CONTINUOUS_BACKUPS,
    V9_AI_COMMIT_MESSAGES,
    V10_AUTOMATIC_PROFILES,
    V11_AUTOMATIC_PROFILE_SOURCE_LINK,
    V12_AUTOMATIC_PROFILE_OWNERSHIP,
    V13_ANONYMOUS_TELEMETRY,
    V14_OPEN_LANGUAGE_TAGS,
];

pub const fn latest_version() -> i64 {
    MIGRATIONS.len() as i64
}

pub fn run(conn: &mut Connection) -> AppResult<()> {
    let current: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    for (index, sql) in MIGRATIONS.iter().enumerate() {
        let version = (index + 1) as i64;
        if version <= current {
            continue;
        }
        let tx = conn.transaction()?;
        tx.execute_batch(sql)?;
        tx.pragma_update(None, "user_version", version)?;
        tx.commit()?;
        log::info!("applied database migration v{version}");
    }
    Ok(())
}

const V1_INITIAL_SCHEMA: &str = r#"
CREATE TABLE backup_profiles (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    name              TEXT    NOT NULL,
    repository_owner  TEXT,
    repository_name   TEXT,
    repository_url    TEXT,
    branch            TEXT    NOT NULL DEFAULT 'main',
    enabled           INTEGER NOT NULL DEFAULT 1,
    created_at        TEXT    NOT NULL,
    updated_at        TEXT    NOT NULL
);

CREATE TABLE backup_sources (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL REFERENCES backup_profiles(id) ON DELETE CASCADE,
    path       TEXT    NOT NULL,
    enabled    INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL
);
CREATE INDEX idx_backup_sources_profile ON backup_sources(profile_id);

CREATE TABLE file_snapshots (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id     INTEGER NOT NULL REFERENCES backup_sources(id) ON DELETE CASCADE,
    relative_path TEXT    NOT NULL,
    hash          TEXT    NOT NULL,
    size          INTEGER NOT NULL,
    modified_at   TEXT    NOT NULL,
    last_seen_at  TEXT    NOT NULL,
    UNIQUE(source_id, relative_path)
);
CREATE INDEX idx_file_snapshots_source ON file_snapshots(source_id);

CREATE TABLE backup_runs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id      INTEGER NOT NULL REFERENCES backup_profiles(id) ON DELETE CASCADE,
    started_at      TEXT    NOT NULL,
    completed_at    TEXT,
    status          TEXT    NOT NULL,
    files_added     INTEGER NOT NULL DEFAULT 0,
    files_modified  INTEGER NOT NULL DEFAULT 0,
    files_deleted   INTEGER NOT NULL DEFAULT 0,
    bytes_processed INTEGER NOT NULL DEFAULT 0,
    commit_sha      TEXT,
    error_message   TEXT
);
CREATE INDEX idx_backup_runs_profile ON backup_runs(profile_id, started_at DESC);

CREATE TABLE backup_settings (
    profile_id            INTEGER PRIMARY KEY REFERENCES backup_profiles(id) ON DELETE CASCADE,
    backup_time           TEXT,
    backup_on_startup     INTEGER NOT NULL DEFAULT 0,
    autostart_enabled     INTEGER NOT NULL DEFAULT 0,
    notifications_enabled INTEGER NOT NULL DEFAULT 1
);
"#;

const V2_GITHUB_ACCOUNTS: &str = r#"
CREATE TABLE github_accounts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    label          TEXT NOT NULL,
    username       TEXT,
    auth_method    TEXT NOT NULL,
    avatar_url     TEXT,
    ssh_public_key TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
);

ALTER TABLE backup_profiles
    ADD COLUMN github_account_id INTEGER REFERENCES github_accounts(id) ON DELETE SET NULL;
"#;

const V3_EXCLUDE_PROFILES: &str = r#"
CREATE TABLE exclude_profiles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE exclude_rules (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    exclude_profile_id INTEGER NOT NULL REFERENCES exclude_profiles(id) ON DELETE CASCADE,
    pattern            TEXT    NOT NULL,
    enabled            INTEGER NOT NULL DEFAULT 1,
    created_at         TEXT    NOT NULL
);
CREATE INDEX idx_exclude_rules_profile ON exclude_rules(exclude_profile_id);

ALTER TABLE backup_sources
    ADD COLUMN exclude_profile_id INTEGER REFERENCES exclude_profiles(id) ON DELETE SET NULL;
"#;

const V4_APP_SETTINGS: &str = r#"
CREATE TABLE app_settings (
    id                INTEGER PRIMARY KEY CHECK (id = 1),
    launch_at_startup INTEGER NOT NULL DEFAULT 0,
    minimize_to_tray  INTEGER NOT NULL DEFAULT 1,
    updated_at        TEXT    NOT NULL
);

INSERT INTO app_settings (id, launch_at_startup, minimize_to_tray, updated_at)
VALUES (1, 0, 1, CURRENT_TIMESTAMP);
"#;

const V5_THEME_AND_EXACT_EXCLUDES: &str = r#"
ALTER TABLE app_settings
    ADD COLUMN theme TEXT NOT NULL DEFAULT 'system'
        CHECK (theme IN ('light', 'dark', 'system'));

ALTER TABLE exclude_rules
    ADD COLUMN rule_kind TEXT NOT NULL DEFAULT 'glob'
        CHECK (rule_kind IN ('glob', 'exact'));
"#;

const V6_GIT_PROVIDERS: &str = r#"
ALTER TABLE github_accounts RENAME TO integration_accounts;

ALTER TABLE integration_accounts
    ADD COLUMN provider TEXT NOT NULL DEFAULT 'github'
        CHECK (provider IN ('github', 'gitlab', 'gitea'));

ALTER TABLE integration_accounts
    ADD COLUMN base_url TEXT NOT NULL DEFAULT 'https://github.com';

ALTER TABLE backup_profiles
    RENAME COLUMN github_account_id TO integration_account_id;

CREATE INDEX idx_integration_accounts_provider
    ON integration_accounts(provider, created_at, id);
"#;

const V7_LANGUAGE_AND_TIME_ZONE: &str = r#"
ALTER TABLE app_settings
    ADD COLUMN language TEXT NOT NULL DEFAULT 'system'
        CHECK (language IN ('system', 'en', 'tr'));

ALTER TABLE app_settings
    ADD COLUMN time_zone TEXT NOT NULL DEFAULT 'system';
"#;

const V8_CONTINUOUS_BACKUPS: &str = r#"
ALTER TABLE backup_settings
    ADD COLUMN continuous_backup_enabled INTEGER NOT NULL DEFAULT 0;

ALTER TABLE backup_settings
    ADD COLUMN change_debounce_seconds INTEGER NOT NULL DEFAULT 10
        CHECK (change_debounce_seconds BETWEEN 5 AND 3600);

ALTER TABLE backup_settings
    ADD COLUMN last_snapshot_path TEXT;
"#;

const V9_AI_COMMIT_MESSAGES: &str = r#"
CREATE TABLE ai_provider_accounts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    provider   TEXT    NOT NULL
        CHECK (provider IN ('openai', 'openrouter', 'anthropic', 'ollama', 'custom')),
    label      TEXT    NOT NULL,
    base_url   TEXT    NOT NULL,
    model      TEXT    NOT NULL,
    created_at TEXT    NOT NULL,
    updated_at TEXT    NOT NULL
);
CREATE INDEX idx_ai_provider_accounts_provider
    ON ai_provider_accounts(provider, created_at, id);

ALTER TABLE backup_settings
    ADD COLUMN ai_account_id INTEGER
        REFERENCES ai_provider_accounts(id) ON DELETE SET NULL;

ALTER TABLE backup_settings
    ADD COLUMN ai_major_commit_messages_enabled INTEGER NOT NULL DEFAULT 0;

ALTER TABLE backup_settings
    ADD COLUMN ai_fast_commit_messages_enabled INTEGER NOT NULL DEFAULT 0;
"#;

const V10_AUTOMATIC_PROFILES: &str = r#"
ALTER TABLE backup_sources
    ADD COLUMN scan_mode TEXT NOT NULL DEFAULT 'recursive'
        CHECK (scan_mode IN ('recursive', 'direct_files'));

CREATE TABLE automatic_profile_rules (
    id                              INTEGER PRIMARY KEY AUTOINCREMENT,
    name                            TEXT    NOT NULL,
    root_path                       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    enabled                         INTEGER NOT NULL DEFAULT 1,
    integration_account_id          INTEGER REFERENCES integration_accounts(id) ON DELETE SET NULL,
    branch                          TEXT    NOT NULL DEFAULT 'main',
    exclude_profile_id              INTEGER REFERENCES exclude_profiles(id) ON DELETE SET NULL,
    backup_time                     TEXT,
    backup_on_startup               INTEGER NOT NULL DEFAULT 0,
    notifications_enabled           INTEGER NOT NULL DEFAULT 1,
    continuous_backup_enabled       INTEGER NOT NULL DEFAULT 1,
    change_debounce_seconds         INTEGER NOT NULL DEFAULT 10
        CHECK (change_debounce_seconds BETWEEN 5 AND 3600),
    ai_account_id                   INTEGER REFERENCES ai_provider_accounts(id) ON DELETE SET NULL,
    ai_major_commit_messages_enabled INTEGER NOT NULL DEFAULT 0,
    ai_fast_commit_messages_enabled INTEGER NOT NULL DEFAULT 0,
    auto_create_repositories        INTEGER NOT NULL DEFAULT 1,
    last_reconciled_at              TEXT,
    last_error                      TEXT,
    created_at                      TEXT    NOT NULL,
    updated_at                      TEXT    NOT NULL
);
CREATE INDEX idx_automatic_profile_rules_enabled
    ON automatic_profile_rules(enabled, created_at, id);

CREATE TABLE automatic_profile_members (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id       INTEGER NOT NULL REFERENCES automatic_profile_rules(id) ON DELETE CASCADE,
    entry_key     TEXT    NOT NULL,
    entry_name    TEXT    NOT NULL,
    entry_kind    TEXT    NOT NULL CHECK (entry_kind IN ('root_files', 'directory')),
    profile_id    INTEGER REFERENCES backup_profiles(id) ON DELETE SET NULL,
    source_path   TEXT    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'missing', 'error')),
    error_message TEXT,
    created_at    TEXT    NOT NULL,
    updated_at    TEXT    NOT NULL,
    UNIQUE(rule_id, entry_key)
);
CREATE INDEX idx_automatic_profile_members_rule
    ON automatic_profile_members(rule_id, status, entry_kind, id);
CREATE INDEX idx_automatic_profile_members_profile
    ON automatic_profile_members(profile_id);
"#;

const V11_AUTOMATIC_PROFILE_SOURCE_LINK: &str = r#"
ALTER TABLE automatic_profile_members
    ADD COLUMN source_id INTEGER REFERENCES backup_sources(id) ON DELETE SET NULL;

CREATE INDEX idx_automatic_profile_members_source
    ON automatic_profile_members(source_id);
"#;

const V12_AUTOMATIC_PROFILE_OWNERSHIP: &str = r#"
ALTER TABLE backup_profiles
    ADD COLUMN automatic_profile_rule_id INTEGER
        REFERENCES automatic_profile_rules(id) ON DELETE SET NULL;

ALTER TABLE backup_profiles
    ADD COLUMN archived_at TEXT;

UPDATE backup_profiles
SET automatic_profile_rule_id = (
    SELECT member.rule_id
    FROM automatic_profile_members AS member
    WHERE member.profile_id = backup_profiles.id
    ORDER BY member.id
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1
    FROM automatic_profile_members AS member
    WHERE member.profile_id = backup_profiles.id
);

CREATE INDEX idx_backup_profiles_automatic_rule
    ON backup_profiles(automatic_profile_rule_id);
CREATE INDEX idx_backup_profiles_archived
    ON backup_profiles(archived_at, enabled, id);
"#;

const V13_ANONYMOUS_TELEMETRY: &str = r#"
ALTER TABLE app_settings
    ADD COLUMN telemetry_enabled INTEGER NOT NULL DEFAULT 1;

ALTER TABLE app_settings
    ADD COLUMN telemetry_last_ping_date TEXT;
"#;

// The V7 language column carried CHECK (language IN ('system', 'en', 'tr')),
// which made every new app language a schema migration. SQLite cannot drop a
// CHECK, so the table is rebuilt without it; language tags are validated in
// Rust instead and the shipped languages live in the frontend i18n folder.
const V14_OPEN_LANGUAGE_TAGS: &str = r#"
CREATE TABLE app_settings_new (
    id                       INTEGER PRIMARY KEY CHECK (id = 1),
    launch_at_startup        INTEGER NOT NULL DEFAULT 0,
    minimize_to_tray         INTEGER NOT NULL DEFAULT 1,
    updated_at               TEXT    NOT NULL,
    theme                    TEXT    NOT NULL DEFAULT 'system'
        CHECK (theme IN ('light', 'dark', 'system')),
    language                 TEXT    NOT NULL DEFAULT 'system',
    time_zone                TEXT    NOT NULL DEFAULT 'system',
    telemetry_enabled        INTEGER NOT NULL DEFAULT 1,
    telemetry_last_ping_date TEXT
);

INSERT INTO app_settings_new
    (id, launch_at_startup, minimize_to_tray, updated_at, theme, language,
     time_zone, telemetry_enabled, telemetry_last_ping_date)
SELECT id, launch_at_startup, minimize_to_tray, updated_at, theme, language,
       time_zone, telemetry_enabled, telemetry_last_ping_date
FROM app_settings;

DROP TABLE app_settings;
ALTER TABLE app_settings_new RENAME TO app_settings;
"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrates_existing_github_accounts_without_losing_profile_links() {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.pragma_update(None, "foreign_keys", "ON").unwrap();
        for migration in MIGRATIONS.iter().take(5) {
            conn.execute_batch(migration).unwrap();
        }
        conn.pragma_update(None, "user_version", 5).unwrap();
        conn.execute(
            "INSERT INTO github_accounts \
                 (id, label, username, auth_method, created_at, updated_at) \
             VALUES (7, 'Personal', 'octocat', 'pat', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO backup_profiles \
                 (id, name, branch, enabled, github_account_id, created_at, updated_at) \
             VALUES (3, 'Documents', 'main', 1, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            [],
        )
        .unwrap();

        run(&mut conn).unwrap();

        let account: (String, String) = conn
            .query_row(
                "SELECT provider, base_url FROM integration_accounts WHERE id = 7",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        let linked_id: i64 = conn
            .query_row(
                "SELECT integration_account_id FROM backup_profiles WHERE id = 3",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(account, ("github".into(), "https://github.com".into()));
        assert_eq!(linked_id, 7);
    }

    #[test]
    fn v11_repairs_the_previously_applied_automatic_profile_schema() {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.pragma_update(None, "foreign_keys", "ON").unwrap();
        for migration in MIGRATIONS.iter().take(10) {
            conn.execute_batch(migration).unwrap();
        }
        conn.pragma_update(None, "user_version", 10).unwrap();

        let before: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('automatic_profile_members') \
                 WHERE name = 'source_id'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(before, 0);

        run(&mut conn).unwrap();

        let after: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('automatic_profile_members') \
                 WHERE name = 'source_id'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let version: i64 = conn
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(after, 1);
        assert_eq!(version, latest_version());
    }

    #[test]
    fn v12_backfills_generated_profile_ownership() {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.pragma_update(None, "foreign_keys", "ON").unwrap();
        for migration in MIGRATIONS.iter().take(11) {
            conn.execute_batch(migration).unwrap();
        }
        conn.pragma_update(None, "user_version", 11).unwrap();
        conn.execute(
            "INSERT INTO automatic_profile_rules \
                 (id, name, root_path, created_at, updated_at) \
             VALUES (7, 'Desktop', 'C:\\Desktop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO backup_profiles \
                 (id, name, branch, enabled, created_at, updated_at) \
             VALUES (3, 'Project', 'main', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO automatic_profile_members \
                 (rule_id, entry_key, entry_name, entry_kind, profile_id, source_path, \
                  created_at, updated_at) \
             VALUES (7, 'folder:project', 'Project', 'directory', 3, \
                     'C:\\Desktop\\Project', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            [],
        )
        .unwrap();

        run(&mut conn).unwrap();

        let owner: Option<i64> = conn
            .query_row(
                "SELECT automatic_profile_rule_id FROM backup_profiles WHERE id = 3",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(owner, Some(7));
    }
}
