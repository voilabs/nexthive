//! Minimal GitHub REST API client (token validation for now; repository
//! listing/creation arrive with phase 3).

use std::time::Duration;

use serde::Deserialize;

use crate::errors::{AppError, AppResult};

const API_BASE: &str = "https://api.github.com";
const USER_AGENT: &str = concat!("NextHive/", env!("CARGO_PKG_VERSION"));

#[derive(Debug, Clone, Deserialize)]
pub struct GitHubUser {
    pub login: String,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone)]
pub struct TokenValidation {
    pub user: GitHubUser,
    /// Warning text when the token looks under-privileged; `None` when the
    /// token is fine or scopes cannot be determined (fine-grained PATs).
    pub scope_warning: Option<String>,
}

fn client() -> AppResult<reqwest::Client> {
    Ok(reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(Duration::from_secs(15))
        .build()?)
}

/// Validate a personal access token by fetching the authenticated user.
pub async fn validate_token(token: &str) -> AppResult<TokenValidation> {
    let response = client()?
        .get(format!("{API_BASE}/user"))
        .bearer_auth(token)
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await?;

    match response.status() {
        reqwest::StatusCode::OK => {
            // Classic PATs advertise their scopes; fine-grained PATs omit
            // the header, in which case we cannot check.
            let scope_warning = response
                .headers()
                .get("x-oauth-scopes")
                .and_then(|value| value.to_str().ok())
                .filter(|scopes| !scopes.split(',').any(|s| s.trim() == "repo"))
                .map(|_| {
                    "This token is missing the `repo` scope, so NextHive will not be able \
                     to create or push to private repositories."
                        .to_string()
                });
            let user: GitHubUser = response.json().await?;
            Ok(TokenValidation {
                user,
                scope_warning,
            })
        }
        reqwest::StatusCode::UNAUTHORIZED => Err(AppError::GitHub(
            "GitHub rejected the token. Check that it is valid and not expired.".into(),
        )),
        status => {
            log::error!("GitHub /user returned unexpected status {status}");
            Err(AppError::GitHub(format!(
                "GitHub API returned an unexpected response ({status})."
            )))
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct GitHubRepository {
    pub name: String,
    pub full_name: String,
    pub html_url: String,
    pub private: bool,
    pub default_branch: Option<String>,
    pub owner: RepositoryOwner,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RepositoryOwner {
    pub login: String,
}

/// List repositories the token owner can push backups to. Paginated at
/// 100 per page; capped at 5 pages to keep the response bounded.
pub async fn list_repositories(token: &str) -> AppResult<Vec<GitHubRepository>> {
    const PER_PAGE: usize = 100;
    const MAX_PAGES: u32 = 5;

    let client = client()?;
    let mut repositories = Vec::new();
    for page in 1..=MAX_PAGES {
        let response = client
            .get(format!("{API_BASE}/user/repos"))
            .query(&[
                ("per_page", PER_PAGE.to_string()),
                ("page", page.to_string()),
                ("sort", "updated".to_string()),
                ("affiliation", "owner".to_string()),
            ])
            .bearer_auth(token)
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .send()
            .await?;

        match response.status() {
            reqwest::StatusCode::OK => {
                let batch: Vec<GitHubRepository> = response.json().await?;
                let is_last_page = batch.len() < PER_PAGE;
                repositories.extend(batch);
                if is_last_page {
                    break;
                }
            }
            reqwest::StatusCode::UNAUTHORIZED => {
                return Err(AppError::GitHub(
                    "GitHub rejected the token. Check that it is valid and not expired.".into(),
                ))
            }
            status => {
                log::error!("GitHub /user/repos list returned unexpected status {status}");
                return Err(AppError::GitHub(format!(
                    "GitHub API returned an unexpected response ({status})."
                )));
            }
        }
    }
    Ok(repositories)
}

pub enum CreateRepositoryOutcome {
    Created(GitHubRepository),
    /// The name is already taken on this account; the caller may retry
    /// with a different name.
    NameTaken,
}

#[derive(serde::Serialize)]
struct CreateRepositoryBody<'a> {
    name: &'a str,
    description: &'a str,
    private: bool,
    auto_init: bool,
    has_issues: bool,
    has_projects: bool,
    has_wiki: bool,
}

#[derive(Deserialize)]
struct ApiErrorBody {
    #[serde(default)]
    message: String,
    #[serde(default)]
    errors: Vec<ApiErrorDetail>,
}

#[derive(Deserialize)]
struct ApiErrorDetail {
    #[serde(default)]
    message: String,
}

/// Create a private repository for the authenticated user. The repository
/// is left empty (no auto-init) so the first backup push establishes the
/// history without divergence.
pub async fn create_private_repository(
    token: &str,
    name: &str,
    description: &str,
) -> AppResult<CreateRepositoryOutcome> {
    let response = client()?
        .post(format!("{API_BASE}/user/repos"))
        .bearer_auth(token)
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&CreateRepositoryBody {
            name,
            description,
            private: true,
            auto_init: false,
            has_issues: false,
            has_projects: false,
            has_wiki: false,
        })
        .send()
        .await?;

    match response.status() {
        reqwest::StatusCode::CREATED => {
            let repository: GitHubRepository = response.json().await?;
            Ok(CreateRepositoryOutcome::Created(repository))
        }
        reqwest::StatusCode::UNPROCESSABLE_ENTITY => {
            let body: ApiErrorBody = response.json().await.unwrap_or(ApiErrorBody {
                message: String::new(),
                errors: Vec::new(),
            });
            let name_taken = body
                .errors
                .iter()
                .any(|e| e.message.contains("already exists"));
            if name_taken {
                Ok(CreateRepositoryOutcome::NameTaken)
            } else {
                log::error!("repository creation rejected: {}", body.message);
                Err(AppError::GitHub(format!(
                    "GitHub rejected the repository: {}",
                    if body.message.is_empty() {
                        "validation failed".to_string()
                    } else {
                        body.message
                    }
                )))
            }
        }
        reqwest::StatusCode::UNAUTHORIZED => Err(AppError::GitHub(
            "GitHub rejected the token. Check that it is valid and not expired.".into(),
        )),
        reqwest::StatusCode::FORBIDDEN => Err(AppError::GitHub(
            "GitHub refused to create the repository. The token may lack the `repo` scope \
             (or repository administration permission for fine-grained tokens)."
                .into(),
        )),
        status => {
            log::error!("GitHub /user/repos returned unexpected status {status}");
            Err(AppError::GitHub(format!(
                "GitHub API returned an unexpected response ({status})."
            )))
        }
    }
}
