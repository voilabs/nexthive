//! Filesystem scanner: source validation, recursive walking with ignore
//! rules, and SHA-256 hashing. Runs on blocking threads — never on the UI
//! or async runtime threads.

pub mod excludes;

use std::io::Read;
use std::path::{Path, PathBuf};

use chrono::{DateTime, Utc};
use sha2::{Digest, Sha256};

use crate::errors::{AppError, AppResult};
use crate::models::SourceScanMode;

/// Directory names that are never backed up, compared case-insensitively.
const IGNORED_DIRECTORIES: &[&str] = &[
    ".git",
    "node_modules",
    ".next",
    "dist",
    "build",
    "target",
    ".cache",
    "tmp",
    "temp",
    "$recycle.bin",
    "system volume information",
];

/// File names / patterns that are never backed up.
const IGNORED_FILES: &[&str] = &["thumbs.db", "desktop.ini", ".ds_store"];

fn is_ignored_dir(name: &str) -> bool {
    IGNORED_DIRECTORIES.contains(&name.to_ascii_lowercase().as_str())
}

fn is_ignored_file(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    IGNORED_FILES.contains(&lower.as_str()) || lower.ends_with(".tmp") || lower.starts_with("~$")
}

/// One file found during a scan.
#[derive(Debug, Clone)]
pub struct ScannedFile {
    /// Path relative to the source root, using forward slashes so it is
    /// stable across platforms and matches Git's path convention.
    pub relative_path: String,
    pub absolute_path: PathBuf,
    pub size: i64,
    pub modified_at: DateTime<Utc>,
}

/// Relative path with forward slashes, or `None` for the root itself.
pub(crate) fn relative_slash_path(root: &Path, path: &Path) -> Option<String> {
    let relative = path.strip_prefix(root).ok()?;
    if relative.as_os_str().is_empty() {
        return None;
    }
    Some(
        relative
            .components()
            .map(|c| c.as_os_str().to_string_lossy())
            .collect::<Vec<_>>()
            .join("/"),
    )
}

/// Fast watcher-side filter mirroring scanner defaults. The full scanner is
/// still authoritative; this prevents ignored build/temp noise from filling
/// the change queue in the first place.
pub(crate) fn is_default_ignored_relative(relative: &str) -> bool {
    let components = relative
        .split('/')
        .filter(|component| !component.is_empty())
        .collect::<Vec<_>>();
    components.iter().any(|component| is_ignored_dir(component))
        || components.last().is_some_and(|name| is_ignored_file(name))
}

/// Recursively scan a source folder, applying the default ignore rules and
/// the source's exclude patterns. Symlinks are never followed (loop and
/// traversal safety). `on_progress` receives the running file count in
/// batches.
pub fn scan_source(
    source_id: i64,
    root: &Path,
    scan_mode: SourceScanMode,
    exclude: Option<&excludes::ExcludeMatcher>,
    mut on_progress: impl FnMut(usize),
) -> AppResult<Vec<ScannedFile>> {
    const PROGRESS_BATCH: usize = 500;

    if scan_mode == SourceScanMode::DirectFiles {
        let mut files = Vec::new();
        let entries = std::fs::read_dir(root).map_err(|error| {
            log::warn!("direct-file scan could not read source #{source_id}: {error}");
            AppError::Validation("The automatic profile root is missing or cannot be read.".into())
        })?;
        for entry in entries {
            let entry = entry.map_err(|error| {
                AppError::internal(format!(
                    "direct-file scan failed below source #{source_id}: {error}"
                ))
            })?;
            let file_type = entry.file_type().map_err(|error| {
                AppError::internal(format!(
                    "direct-file scan could not inspect source #{source_id}: {error}"
                ))
            })?;
            if !file_type.is_file() || file_type.is_symlink() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().into_owned();
            if is_ignored_file(&name) || exclude.is_some_and(|matcher| matcher.is_match(&name)) {
                continue;
            }
            let metadata = entry.metadata().map_err(|error| {
                AppError::backup_file(
                    "A file could not be inspected. Exclude it or fix its permissions, then try again.",
                    source_id,
                    name.clone(),
                    error.to_string(),
                )
            })?;
            files.push(ScannedFile {
                relative_path: name,
                absolute_path: entry.path(),
                size: metadata.len() as i64,
                modified_at: metadata
                    .modified()
                    .map(DateTime::<Utc>::from)
                    .unwrap_or_else(|_| Utc::now()),
            });
            if files.len() % PROGRESS_BATCH == 0 {
                on_progress(files.len());
            }
        }
        on_progress(files.len());
        return Ok(files);
    }

    let mut files = Vec::new();
    let walk_root = root.to_path_buf();
    let walker = walkdir::WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(move |entry| {
            if entry.file_type().is_dir() {
                let name = entry.file_name().to_string_lossy();
                if is_ignored_dir(&name) {
                    return false;
                }
                // Excluded directories are pruned early so their (possibly
                // huge) contents are never walked.
                if let (Some(matcher), Some(relative)) =
                    (exclude, relative_slash_path(&walk_root, entry.path()))
                {
                    if matcher.is_match(&relative) {
                        return false;
                    }
                }
            }
            true
        });

    for entry in walker {
        let entry = match entry {
            Ok(entry) => entry,
            Err(error) => {
                let relative = error
                    .path()
                    .and_then(|path| relative_slash_path(root, path));
                log::warn!(
                    "scan could not read an entry under {}: {error}",
                    root.display()
                );
                if let Some(relative_path) = relative {
                    return Err(AppError::backup_file(
                        "A file or folder could not be read. Exclude it or fix its permissions, then try again.",
                        source_id,
                        relative_path,
                        error.to_string(),
                    ));
                }
                return Err(AppError::internal(format!(
                    "scan failed below source #{source_id}: {error}"
                )));
            }
        };
        if !entry.file_type().is_file() {
            continue;
        }
        let name = entry.file_name().to_string_lossy();
        if is_ignored_file(&name) {
            continue;
        }
        if let (Some(matcher), Some(relative)) = (exclude, relative_slash_path(root, entry.path()))
        {
            if matcher.is_match(&relative) {
                continue;
            }
        }

        let metadata = match entry.metadata() {
            Ok(metadata) => metadata,
            Err(error) => {
                log::warn!("scan could not stat {}: {error}", entry.path().display());
                let relative_path = relative_slash_path(root, entry.path())
                    .unwrap_or_else(|| entry.file_name().to_string_lossy().into_owned());
                return Err(AppError::backup_file(
                    "A file could not be inspected. Exclude it or fix its permissions, then try again.",
                    source_id,
                    relative_path,
                    error.to_string(),
                ));
            }
        };
        let modified_at = match metadata.modified() {
            Ok(time) => DateTime::<Utc>::from(time),
            Err(_) => Utc::now(),
        };
        let relative = entry
            .path()
            .strip_prefix(root)
            .map_err(|_| AppError::internal("walked file outside its scan root"))?;
        files.push(ScannedFile {
            relative_path: relative
                .components()
                .map(|c| c.as_os_str().to_string_lossy())
                .collect::<Vec<_>>()
                .join("/"),
            absolute_path: entry.path().to_path_buf(),
            size: metadata.len() as i64,
            modified_at,
        });
        if files.len() % PROGRESS_BATCH == 0 {
            on_progress(files.len());
        }
    }
    on_progress(files.len());
    Ok(files)
}

/// Streaming SHA-256 of a file's contents, hex-encoded.
pub fn hash_file(path: &Path) -> AppResult<String> {
    let mut file = std::fs::File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 1024 * 1024];
    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

/// Validate a user-selected backup source folder and return its canonical
/// form (symlinks resolved, consistent casing/separators) so duplicate and
/// overlap detection is reliable.
pub fn validate_source_path(raw: &str) -> AppResult<PathBuf> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(AppError::Validation("Choose a folder to back up.".into()));
    }

    let path = Path::new(trimmed);
    if !path.is_absolute() {
        return Err(AppError::Validation(
            "The folder path must be absolute.".into(),
        ));
    }

    let canonical = dunce::canonicalize(path).map_err(|_| {
        AppError::Validation(format!(
            "\"{trimmed}\" does not exist or is not accessible."
        ))
    })?;

    if !canonical.is_dir() {
        return Err(AppError::Validation(format!(
            "\"{trimmed}\" is not a folder."
        )));
    }

    // A drive/filesystem root would sweep in the whole disk (and endless
    // system files); require a specific folder instead.
    if canonical.parent().is_none() {
        return Err(AppError::Validation(
            "Choose a specific folder rather than an entire drive.".into(),
        ));
    }

    Ok(canonical)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scan_finds_files_and_skips_ignored_dirs() {
        let dir = std::env::temp_dir().join(format!("nexthive-scan-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("docs")).unwrap();
        std::fs::create_dir_all(dir.join("node_modules").join("pkg")).unwrap();
        std::fs::write(dir.join("a.txt"), b"hello").unwrap();
        std::fs::write(dir.join("docs").join("b.txt"), b"world").unwrap();
        std::fs::write(dir.join("node_modules").join("pkg").join("c.js"), b"x").unwrap();
        std::fs::write(dir.join("Thumbs.db"), b"x").unwrap();

        let files = scan_source(1, &dir, SourceScanMode::Recursive, None, |_| {}).unwrap();
        let mut paths: Vec<_> = files.iter().map(|f| f.relative_path.as_str()).collect();
        paths.sort_unstable();
        assert_eq!(paths, vec!["a.txt", "docs/b.txt"]);

        // With an exclude matcher, docs/ is pruned entirely.
        let matcher = excludes::build_rules_matcher(&[(
            crate::models::ExcludeRuleKind::Glob,
            "docs".to_string(),
        )])
        .unwrap();
        let files =
            scan_source(1, &dir, SourceScanMode::Recursive, Some(&matcher), |_| {}).unwrap();
        let paths: Vec<_> = files.iter().map(|f| f.relative_path.as_str()).collect();
        assert_eq!(paths, vec!["a.txt"]);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn hash_is_stable_sha256() {
        let path = std::env::temp_dir().join(format!("nexthive-hash-test-{}", std::process::id()));
        std::fs::write(&path, b"hello").unwrap();
        assert_eq!(
            hash_file(&path).unwrap(),
            "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
        );
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn direct_files_mode_does_not_descend_into_child_folders() {
        let dir =
            std::env::temp_dir().join(format!("nexthive-direct-scan-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("project")).unwrap();
        std::fs::write(dir.join("desktop.txt"), b"root").unwrap();
        std::fs::write(dir.join("project").join("nested.txt"), b"nested").unwrap();

        let files = scan_source(1, &dir, SourceScanMode::DirectFiles, None, |_| {}).unwrap();
        assert_eq!(
            files
                .iter()
                .map(|file| file.relative_path.as_str())
                .collect::<Vec<_>>(),
            vec!["desktop.txt"]
        );

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn watcher_filter_matches_default_scan_ignores() {
        assert!(is_default_ignored_relative(
            "project/node_modules/pkg/index.js"
        ));
        assert!(is_default_ignored_relative("build/output.exe"));
        assert!(is_default_ignored_relative("notes.tmp"));
        assert!(!is_default_ignored_relative("documents/plan.docx"));
    }
}
