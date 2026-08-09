# Changelog

All notable changes to NextHive are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-08-09

### Added

- Added an application-native context menu for cut, copy, paste and select-all actions.
- Added single-instance enforcement so repeated launches focus the existing NextHive window instead of starting another process.

### Security

- Disabled WebView developer tools to prevent the Microsoft Edge inspection interface from being opened in the packaged desktop app.

## [0.1.0] - 2026-08-08

Initial Windows preview release.

### Added

- Added an anonymous daily usage ping — app version and OS name only, no identifiers — with an opt-out switch in Settings → Privacy; the server keeps day totals only.
- Added the nexthive.app website with a grid-based landing page and a download page showing a live, publicly visible active-device count and a full telemetry transparency breakdown.
- Added persisted interface language preferences with system-default, English and Turkish options.
- Added a persisted time-zone preference with daylight-saving-aware system time and portable fixed UTC offsets.
- Added per-profile continuous backups using native filesystem notifications and a configurable change-stacking window.
- Added startup catch-up scans for continuous profiles so changes left pending during shutdown are detected on the next launch.
- Added AI-assisted commit messages with OpenRouter, OpenAI, Anthropic Claude, Ollama and custom OpenAI-compatible endpoints.
- Added profile-level controls for AI messages on major backups and separately opt-in fast backups.
- Added a free-by-default OpenRouter configuration using `openrouter/free` and fully local Ollama support.
- Added Automatic Profiles rules that turn each immediate child folder of a selected root into an independently managed backup profile.
- Added a direct-files source mode so files placed directly in an automatic root are backed up by the automation's own profile without duplicating child-folder contents.
- Added reusable automatic-profile templates for Git account, private repository creation, branch, schedule, continuous backups, exclude profiles, notifications and AI commit messages.
- Added Database Maintenance in Settings with SQLite integrity, foreign-key and schema checks plus non-destructive repair actions.
- Added consistent online safety backups before every manual or automatic database repair.
- Added persistent ownership links between automatic-profile rules and every backup profile they generate.

### Changed

- Rebuilt the desktop interface around a neutral deep-ink theme with grouped settings-style surfaces, pill navigation, tabbed integrations and Windows-style window controls.
- Moved interface languages to self-describing dictionary files discovered at build time; adding a language now only requires one new file under `src/i18n/languages`.
- Removed the database-level language allow-list via a table-rebuild migration so new interface languages never require a schema change.
- Translated the profile detail tabs, profile cards, integrations page, exclude-profile dialogs and backup alerts that previously rendered English-only strings.
- Reorganized the repository into `apps/desktop` for the Tauri product and `apps/web` for the independently deployed marketing website.
- Scoped CI, signed installer creation and updater manifests to the desktop application so website files can never enter desktop release artifacts.
- Replaced the frameless Windows toolbar with a compact macOS-inspired draggable toolbar and traffic-light window controls.
- Reworked the desktop dashboard into denser profile, destination and recent-run views instead of a marketing-style protection hero.
- Simplified sidebar navigation and removed repeated local-protection status labels from the application shell.
- Made the sidebar version entry open the installed version inside an in-app Markdown preview rendered directly from this changelog at build time.
- Updated application, tray, installer and website branding to use the new NextHive icon set with light and dark variants.
- Applied the selected locale and time zone to interface timestamps, number formatting, backup progress and update status.
- Updated daily scheduling, missed-backup catch-up checks and tray timestamps to use the configured time zone.
- Continuous change backups now use the compact `<date>-hot/` root, while manual, startup and scheduled snapshots write directly to `<date>/`.
- Watcher-reported files are force-hashed even when size and modified time appear unchanged; unrelated files retain the fast metadata path.
- AI provider failures now fall back to deterministic commit messages without marking the backup as failed.
- Newly discovered folders create their profile and private repository automatically, then enter a sequential initial-backup queue to avoid unbounded disk and network concurrency.
- Missing automatic-profile folders are paused instead of deleted. Deleting an automation now retires its generated local profiles from NextHive while preserving original files and remote repositories.
- Database schema drift is checked at startup and known safe defects are repaired only after a safety backup is created.

### Fixed

- Added a forward-only V11 migration for automatic-profile source links, fixing repeated `no such column: source_id` database errors on installations that had already applied V10.
- Replaced the generic database error message with safe, actionable messages for schema drift, locking, corruption, permissions, conflicts and full disks.

### Security

- AI API keys are stored only in the operating-system credential vault and are never returned to React or written to SQLite.
- AI requests contain no file contents or absolute paths; only counts and a bounded list of sanitized repository-relative paths are sent.
- Custom AI endpoints require HTTPS, except for loopback-only local servers, and URLs containing embedded credentials are rejected.

### Added

- Added GitLab.com and self-managed GitLab accounts using personal access tokens.
- Added Gitea, Forgejo and Codeberg accounts with configurable server addresses.
- Added repository listing, private repository creation and HTTPS backup pushes for all supported Git providers.
- Added dedicated integration cards and detail pages for GitHub, GitLab and Gitea / Forgejo.
- Added integration catalog cards and security-focused detail pages for Google Drive, Yandex Disk, MEGA and SFTP / FTPS. These destinations are clearly marked as planned until their transfer adapters are complete.

### Changed

- Generalized backup profiles and connected-account persistence from GitHub-specific fields to provider-neutral integration accounts.
- Existing GitHub accounts, profile links and credential-vault token keys are preserved by the database migration.
- Read-only Gitea / Forgejo repositories are filtered out when the server reports repository push permissions.

### Security

- GitLab and Gitea / Forgejo tokens are validated in Rust and stored only in the operating-system credential vault.
- Self-hosted server URLs reject embedded credentials, query strings and fragments; remote HTTP is allowed only for localhost.
- Git LFS files at or above 100 MiB fail visibly on providers whose LFS transport is not implemented instead of producing an incomplete successful backup.
- Unencrypted plain FTP is not presented as the default remote-server transport; SFTP and FTPS are the planned secure defaults.

### Added

- Added signed in-app updates backed by Tauri's updater plugin and GitHub Releases.
- Added a quiet update check when NextHive starts and a manual **Check now** action in Settings.
- Added an application-wide update banner when a newer version is available.
- Added real download progress, release notes, one-click installation and automatic restart.
- Added a local release tool that creates updater signatures and the `latest.json` manifest without sending the signing key to GitHub.

### Changed

- Updated Windows package metadata to use **VoiLabs** as the publisher.
- Updated project metadata to point to [voilabs.com](https://voilabs.com) and the VoiLabs GitHub repository.
- Future updater-enabled GitHub releases are published as stable releases so they can be discovered through the latest-release endpoint.
- GitHub Actions now validates builds and tests only; release signing and publishing happen on the trusted release computer.

### Fixed

- Prevented repeated background update requests when the release manifest or network is unavailable during startup.

### Security

- Update installers are verified against the public updater key embedded in NextHive before installation.
- The matching private signing key remains outside the repository and never leaves the trusted release computer.
- Update failures are returned to the interface as sanitized structured errors while technical details remain in local logs.

### Added

- Added the Tauri v2, React, TypeScript, Vite and Tailwind application foundation.
- Added a frameless desktop shell with Dashboard, Backups, History, Activity, Integrations, Exclusions and Settings pages.
- Added light, dark and system themes.
- Added backup profiles with editable folders, repository settings, schedules and manual backup controls.
- Added native folder selection with canonical path validation and overlapping-source protection.
- Added reusable exclude profiles with glob rules and exact file-path rules assignable per source folder.
- Added the Rust filesystem scanner with incremental metadata checks and SHA-256 hashing when required.
- Added SQLite persistence with versioned migrations for profiles, sources, snapshots, runs, settings, integrations and exclusion rules.
- Added change detection for added, modified and deleted files.
- Added managed backup workspaces that leave original source folders untouched.
- Added dated repository snapshots using the `YYYY-MM-DD/<source-contents>` layout.
- Added embedded Git repository initialization, staging, commits and HTTPS pushes through `libgit2`; system Git is not required.
- Added private GitHub repository creation using the `nexthive-<profile-name>` naming convention.
- Added existing GitHub repository selection while creating or editing a backup profile.
- Added support for multiple GitHub identities using personal access tokens or dedicated SSH keys.
- Added Git LFS uploads for files that exceed GitHub's regular Git file limit.
- Added actionable large-file and problem-file errors with the option to create an exclusion.
- Added manual, daily, startup and missed-schedule catch-up backups.
- Added per-profile locking to prevent duplicate backup operations.
- Added live stage-based backup progress without fabricated percentages.
- Added backup run history, activity events and commit summaries.
- Added Windows autostart, start-minimized behavior and notification-area operation.
- Added tray actions for opening NextHive, starting backups, viewing the latest backup state, opening Settings and quitting.
- Added a GitHub Actions workflow for producing and publishing the Windows NSIS installer from version tags.
- Added rotating local application logs and structured frontend-safe error responses.

### Security

- GitHub personal access tokens are validated in Rust and stored in the operating-system credential vault.
- Credentials are not stored in SQLite, configuration files, browser storage or React state.
- Filesystem and Git operations are exposed through explicit Rust commands instead of global frontend filesystem permissions or shell commands.
- Symlink traversal is disabled during scans and source paths are validated before use.
- New backup repositories are private by default.

### Known limitations

- Restore browsing and file restoration are not included yet.
- SSH identity creation and connection testing are available, but end-to-end SSH backup pushes are not complete; personal access tokens are required for the current backup pipeline.
- Windows installers are not Authenticode-signed yet, so SmartScreen may display an unknown-publisher warning.
- macOS and Linux have not been validated for this release.

[Unreleased]: https://github.com/voilabs/nexthive/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/voilabs/nexthive/releases/tag/v0.1.1
[0.1.0]: https://github.com/voilabs/nexthive/releases/tag/v0.1.0
