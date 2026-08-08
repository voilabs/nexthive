//! Exclude-rule matching: user glob patterns compiled into a `GlobSet`
//! evaluated against relative paths (forward slashes) during scans.
//!
//! Pattern semantics (gitignore-inspired):
//! - `secret.txt` / `*.log` — bare names match at any depth (file or folder)
//! - `cache/**` — everything inside any folder named `cache`
//! - `docs/plan.docx` — patterns with `/` are anchored to the source root
//! - `**/build/temp` — explicit any-depth anchoring also works

use std::collections::HashSet;

use globset::{GlobBuilder, GlobSet, GlobSetBuilder};

use crate::errors::{AppError, AppResult};
use crate::models::ExcludeRuleKind;

pub struct ExcludeMatcher {
    globs: GlobSet,
    exact: HashSet<String>,
}

impl ExcludeMatcher {
    pub fn is_match(&self, path: &str) -> bool {
        self.globs.is_match(path)
            || self
                .exact
                .contains(&path.replace('\\', "/").to_ascii_lowercase())
    }
}

/// Validate one user pattern (called before saving a rule).
pub fn validate_pattern(pattern: &str) -> AppResult<()> {
    let trimmed = pattern.trim();
    if trimmed.is_empty() {
        return Err(AppError::Validation("Pattern cannot be empty.".into()));
    }
    if trimmed.len() > 500 {
        return Err(AppError::Validation("Pattern is too long.".into()));
    }
    if trimmed.contains('\\') {
        return Err(AppError::Validation(
            "Use forward slashes in patterns (e.g. docs/plan.docx).".into(),
        ));
    }
    build_matcher(std::slice::from_ref(&trimmed.to_string()))?;
    Ok(())
}

/// Compile patterns into a matcher. Bare patterns (no `/`) are expanded to
/// match at any depth; anchored patterns match from the source root.
pub fn build_matcher(patterns: &[String]) -> AppResult<GlobSet> {
    build_rules_matcher(
        &patterns
            .iter()
            .cloned()
            .map(|pattern| (ExcludeRuleKind::Glob, pattern))
            .collect::<Vec<_>>(),
    )
    .map(|matcher| matcher.globs)
}

pub fn build_rules_matcher(rules: &[(ExcludeRuleKind, String)]) -> AppResult<ExcludeMatcher> {
    let mut builder = GlobSetBuilder::new();
    let mut exact = HashSet::new();
    for (kind, raw) in rules {
        if *kind == ExcludeRuleKind::Exact {
            let normalized = raw.trim().trim_matches('/').replace('\\', "/");
            if !normalized.is_empty() {
                exact.insert(normalized.to_ascii_lowercase());
            }
            continue;
        }
        let pattern = raw.trim().trim_matches('/');
        if pattern.is_empty() {
            continue;
        }
        let expansions: Vec<String> = if pattern.contains('/') {
            // Anchored: the path itself, plus everything beneath it.
            vec![pattern.to_string(), format!("{pattern}/**")]
        } else {
            // Bare name: match files/folders with this name at any depth.
            vec![
                pattern.to_string(),
                format!("**/{pattern}"),
                format!("{pattern}/**"),
                format!("**/{pattern}/**"),
            ]
        };
        for expansion in expansions {
            let glob = GlobBuilder::new(&expansion)
                .case_insensitive(true)
                .literal_separator(true)
                .build()
                .map_err(|e| {
                    AppError::Validation(format!("\"{raw}\" is not a valid pattern: {e}"))
                })?;
            builder.add(glob);
        }
    }
    let globs = builder
        .build()
        .map_err(|e| AppError::Validation(format!("Could not compile patterns: {e}")))?;
    Ok(ExcludeMatcher { globs, exact })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn matcher(patterns: &[&str]) -> GlobSet {
        build_matcher(&patterns.iter().map(|p| p.to_string()).collect::<Vec<_>>()).unwrap()
    }

    #[test]
    fn bare_extension_matches_any_depth() {
        let m = matcher(&["*.log"]);
        assert!(m.is_match("app.log"));
        assert!(m.is_match("deep/nested/trace.log"));
        assert!(!m.is_match("app.txt"));
    }

    #[test]
    fn bare_name_matches_folder_contents() {
        let m = matcher(&["cache"]);
        assert!(m.is_match("cache"));
        assert!(m.is_match("cache/a.bin"));
        assert!(m.is_match("sub/cache/a.bin"));
        assert!(!m.is_match("cachette/a.bin"));
    }

    #[test]
    fn anchored_path_only_matches_from_root() {
        let m = matcher(&["docs/plan.docx"]);
        assert!(m.is_match("docs/plan.docx"));
        assert!(!m.is_match("other/docs/plan.docx"));
    }

    #[test]
    fn matching_is_case_insensitive() {
        let m = matcher(&["*.TMP"]);
        assert!(m.is_match("file.tmp"));
    }

    #[test]
    fn invalid_pattern_is_rejected() {
        assert!(validate_pattern("a[").is_err());
        assert!(validate_pattern("   ").is_err());
        assert!(validate_pattern("docs\\plan.docx").is_err());
    }

    #[test]
    fn exact_rules_do_not_treat_glob_characters_as_wildcards() {
        let matcher =
            build_rules_matcher(&[(ExcludeRuleKind::Exact, "reports/[final].zip".into())]).unwrap();
        assert!(matcher.is_match("reports/[final].zip"));
        assert!(!matcher.is_match("reports/f.zip"));
    }
}
