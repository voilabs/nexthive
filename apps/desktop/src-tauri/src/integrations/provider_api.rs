use std::time::Duration;

use reqwest::{Client, StatusCode, Url};
use serde::{Deserialize, Serialize};

use crate::errors::{AppError, AppResult};
use crate::github::api as github_api;
use crate::models::GitProvider;

const USER_AGENT: &str = "NextHive/0.1";
const MAX_PAGES: u32 = 5;

#[derive(Debug)]
pub struct ProviderIdentity {
    pub username: String,
    pub avatar_url: Option<String>,
    pub warning: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ProviderRepository {
    pub name: String,
    pub full_name: String,
    pub owner: String,
    pub private: bool,
    pub html_url: String,
    pub clone_url: String,
    pub default_branch: Option<String>,
}

pub enum CreateRepositoryOutcome {
    Created(ProviderRepository),
    NameTaken,
}

pub fn normalize_base_url(provider: GitProvider, value: Option<&str>) -> AppResult<String> {
    if provider == GitProvider::GitHub {
        return Ok("https://github.com".into());
    }

    let fallback = match provider {
        GitProvider::GitLab => "https://gitlab.com",
        GitProvider::Gitea => "",
        GitProvider::GitHub => unreachable!(),
    };
    let raw = value
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .unwrap_or(fallback);
    if raw.is_empty() {
        return Err(AppError::Validation(
            "Enter the HTTPS address of your Gitea or Forgejo server.".into(),
        ));
    }

    let mut url = Url::parse(raw)
        .map_err(|_| AppError::Validation("The server address is not a valid URL.".into()))?;
    if !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(AppError::Validation(
            "The server address cannot contain credentials, a query, or a fragment.".into(),
        ));
    }
    let host = url
        .host_str()
        .ok_or_else(|| AppError::Validation("The server address needs a host name.".into()))?;
    let local_host = host.eq_ignore_ascii_case("localhost") || host == "127.0.0.1" || host == "::1";
    if url.scheme() != "https" && !(url.scheme() == "http" && local_host) {
        return Err(AppError::Validation(
            "Use HTTPS for remote Git servers. HTTP is allowed only for localhost.".into(),
        ));
    }

    let trimmed_path = url.path().trim_end_matches('/').to_string();
    url.set_path(&trimmed_path);
    Ok(url.to_string().trim_end_matches('/').to_string())
}

pub fn repository_clone_url(base_url: &str, owner: &str, repository: &str) -> AppResult<String> {
    let owner_segments: Vec<&str> = owner.split('/').collect();
    if owner_segments.is_empty()
        || owner_segments
            .iter()
            .any(|segment| segment.is_empty() || *segment == "." || *segment == "..")
        || repository.is_empty()
        || repository == "."
        || repository == ".."
        || repository.contains('/')
        || repository.contains('\\')
    {
        return Err(AppError::Validation(
            "The selected repository path is not valid.".into(),
        ));
    }

    let mut url = Url::parse(base_url)
        .map_err(|_| AppError::Validation("The provider server address is invalid.".into()))?;
    {
        let mut segments = url.path_segments_mut().map_err(|_| {
            AppError::Validation("The provider server address cannot host repositories.".into())
        })?;
        segments.pop_if_empty();
        segments.extend(owner_segments);
        segments.push(&format!("{repository}.git"));
    }
    Ok(url.to_string())
}

pub fn git_username(provider: GitProvider, username: Option<&str>) -> String {
    match provider {
        GitProvider::GitHub => "x-access-token".into(),
        GitProvider::GitLab => "oauth2".into(),
        GitProvider::Gitea => username.unwrap_or("nexthive").to_string(),
    }
}

fn client() -> AppResult<Client> {
    Ok(Client::builder()
        .user_agent(USER_AGENT)
        .timeout(Duration::from_secs(20))
        .build()?)
}

fn provider_error(provider: GitProvider, message: impl Into<String>) -> AppError {
    AppError::Integration(format!("{}: {}", provider.display_name(), message.into()))
}

pub async fn validate_token(
    provider: GitProvider,
    base_url: &str,
    token: &str,
) -> AppResult<ProviderIdentity> {
    match provider {
        GitProvider::GitHub => {
            let result = github_api::validate_token(token).await?;
            Ok(ProviderIdentity {
                username: result.user.login,
                avatar_url: result.user.avatar_url,
                warning: result.scope_warning,
            })
        }
        GitProvider::GitLab => validate_gitlab(base_url, token).await,
        GitProvider::Gitea => validate_gitea(base_url, token).await,
    }
}

#[derive(Deserialize)]
struct GitLabUser {
    username: String,
    avatar_url: Option<String>,
}

async fn validate_gitlab(base_url: &str, token: &str) -> AppResult<ProviderIdentity> {
    let response = client()?
        .get(format!("{base_url}/api/v4/user"))
        .header("PRIVATE-TOKEN", token)
        .send()
        .await?;
    match response.status() {
        StatusCode::OK => {
            let user: GitLabUser = response.json().await?;
            Ok(ProviderIdentity {
                username: user.username,
                avatar_url: user.avatar_url,
                warning: None,
            })
        }
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => Err(provider_error(
            GitProvider::GitLab,
            "the token is invalid, expired, or missing the `api` scope.",
        )),
        status => {
            log::error!("GitLab /user returned status {status}");
            Err(provider_error(
                GitProvider::GitLab,
                "the server returned an unexpected response.",
            ))
        }
    }
}

#[derive(Deserialize)]
struct GiteaUser {
    login: String,
    avatar_url: Option<String>,
}

async fn validate_gitea(base_url: &str, token: &str) -> AppResult<ProviderIdentity> {
    let response = client()?
        .get(format!("{base_url}/api/v1/user"))
        .header("Authorization", format!("token {token}"))
        .send()
        .await?;
    match response.status() {
        StatusCode::OK => {
            let user: GiteaUser = response.json().await?;
            Ok(ProviderIdentity {
                username: user.login,
                avatar_url: user.avatar_url,
                warning: None,
            })
        }
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => Err(provider_error(
            GitProvider::Gitea,
            "the token is invalid, expired, or missing user/repository access.",
        )),
        status => {
            log::error!("Gitea /user returned status {status}");
            Err(provider_error(
                GitProvider::Gitea,
                "the server returned an unexpected response.",
            ))
        }
    }
}

pub async fn list_repositories(
    provider: GitProvider,
    base_url: &str,
    token: &str,
) -> AppResult<Vec<ProviderRepository>> {
    match provider {
        GitProvider::GitHub => Ok(github_api::list_repositories(token)
            .await?
            .into_iter()
            .map(|repository| ProviderRepository {
                clone_url: format!("https://github.com/{}.git", repository.full_name),
                name: repository.name,
                full_name: repository.full_name,
                owner: repository.owner.login,
                private: repository.private,
                html_url: repository.html_url,
                default_branch: repository.default_branch,
            })
            .collect()),
        GitProvider::GitLab => list_gitlab_repositories(base_url, token).await,
        GitProvider::Gitea => list_gitea_repositories(base_url, token).await,
    }
}

#[derive(Deserialize)]
struct GitLabNamespace {
    full_path: String,
}

#[derive(Deserialize)]
struct GitLabProject {
    name: String,
    path_with_namespace: String,
    web_url: String,
    http_url_to_repo: String,
    visibility: String,
    default_branch: Option<String>,
    namespace: GitLabNamespace,
}

impl From<GitLabProject> for ProviderRepository {
    fn from(project: GitLabProject) -> Self {
        Self {
            name: project.name,
            full_name: project.path_with_namespace,
            owner: project.namespace.full_path,
            private: project.visibility != "public",
            html_url: project.web_url,
            clone_url: project.http_url_to_repo,
            default_branch: project.default_branch,
        }
    }
}

async fn list_gitlab_repositories(
    base_url: &str,
    token: &str,
) -> AppResult<Vec<ProviderRepository>> {
    let client = client()?;
    let mut repositories = Vec::new();
    for page in 1..=MAX_PAGES {
        let response = client
            .get(format!("{base_url}/api/v4/projects"))
            .header("PRIVATE-TOKEN", token)
            .query(&[
                ("membership", "true"),
                ("min_access_level", "30"),
                ("simple", "true"),
                ("order_by", "last_activity_at"),
                ("per_page", "100"),
                ("page", &page.to_string()),
            ])
            .send()
            .await?;
        if response.status() != StatusCode::OK {
            return Err(provider_error(
                GitProvider::GitLab,
                "repositories could not be listed.",
            ));
        }
        let batch: Vec<GitLabProject> = response.json().await?;
        let last = batch.len() < 100;
        repositories.extend(batch.into_iter().map(ProviderRepository::from));
        if last {
            break;
        }
    }
    Ok(repositories)
}

#[derive(Deserialize)]
struct GiteaRepositoryOwner {
    login: String,
}

#[derive(Deserialize)]
struct GiteaRepositoryPermissions {
    push: bool,
}

#[derive(Deserialize)]
struct GiteaRepository {
    name: String,
    full_name: String,
    html_url: String,
    clone_url: String,
    private: bool,
    default_branch: Option<String>,
    owner: GiteaRepositoryOwner,
    permissions: Option<GiteaRepositoryPermissions>,
}

impl GiteaRepository {
    fn can_push(&self) -> bool {
        // Older Gitea/Forgejo versions may omit permissions. Preserve
        // compatibility there, while filtering explicit read-only results.
        self.permissions
            .as_ref()
            .map(|permissions| permissions.push)
            .unwrap_or(true)
    }
}

impl From<GiteaRepository> for ProviderRepository {
    fn from(repository: GiteaRepository) -> Self {
        Self {
            name: repository.name,
            full_name: repository.full_name,
            owner: repository.owner.login,
            private: repository.private,
            html_url: repository.html_url,
            clone_url: repository.clone_url,
            default_branch: repository.default_branch,
        }
    }
}

async fn list_gitea_repositories(
    base_url: &str,
    token: &str,
) -> AppResult<Vec<ProviderRepository>> {
    let client = client()?;
    let mut repositories = Vec::new();
    for page in 1..=MAX_PAGES {
        let response = client
            .get(format!("{base_url}/api/v1/user/repos"))
            .header("Authorization", format!("token {token}"))
            .query(&[("limit", "50"), ("page", &page.to_string())])
            .send()
            .await?;
        if response.status() != StatusCode::OK {
            return Err(provider_error(
                GitProvider::Gitea,
                "repositories could not be listed.",
            ));
        }
        let batch: Vec<GiteaRepository> = response.json().await?;
        let last = batch.len() < 50;
        repositories.extend(
            batch
                .into_iter()
                .filter(GiteaRepository::can_push)
                .map(ProviderRepository::from),
        );
        if last {
            break;
        }
    }
    Ok(repositories)
}

pub async fn create_private_repository(
    provider: GitProvider,
    base_url: &str,
    token: &str,
    name: &str,
    description: &str,
) -> AppResult<CreateRepositoryOutcome> {
    match provider {
        GitProvider::GitHub => {
            match github_api::create_private_repository(token, name, description).await? {
                github_api::CreateRepositoryOutcome::Created(repository) => {
                    Ok(CreateRepositoryOutcome::Created(ProviderRepository {
                        clone_url: format!("https://github.com/{}.git", repository.full_name),
                        name: repository.name,
                        full_name: repository.full_name,
                        owner: repository.owner.login,
                        private: repository.private,
                        html_url: repository.html_url,
                        default_branch: repository.default_branch,
                    }))
                }
                github_api::CreateRepositoryOutcome::NameTaken => {
                    Ok(CreateRepositoryOutcome::NameTaken)
                }
            }
        }
        GitProvider::GitLab => create_gitlab_repository(base_url, token, name, description).await,
        GitProvider::Gitea => create_gitea_repository(base_url, token, name, description).await,
    }
}

#[derive(Serialize)]
struct GitLabCreateProject<'a> {
    name: &'a str,
    path: &'a str,
    description: &'a str,
    visibility: &'static str,
    initialize_with_readme: bool,
}

async fn create_gitlab_repository(
    base_url: &str,
    token: &str,
    name: &str,
    description: &str,
) -> AppResult<CreateRepositoryOutcome> {
    let response = client()?
        .post(format!("{base_url}/api/v4/projects"))
        .header("PRIVATE-TOKEN", token)
        .json(&GitLabCreateProject {
            name,
            path: name,
            description,
            visibility: "private",
            initialize_with_readme: false,
        })
        .send()
        .await?;
    match response.status() {
        StatusCode::CREATED => Ok(CreateRepositoryOutcome::Created(
            response.json::<GitLabProject>().await?.into(),
        )),
        StatusCode::CONFLICT => Ok(CreateRepositoryOutcome::NameTaken),
        StatusCode::BAD_REQUEST => {
            let body = response.text().await.unwrap_or_default().to_lowercase();
            if body.contains("already been taken") || body.contains("has already been taken") {
                Ok(CreateRepositoryOutcome::NameTaken)
            } else {
                log::error!("GitLab rejected project creation with status 400");
                Err(provider_error(GitProvider::GitLab, "the private repository could not be created. Check your project limit and token permissions."))
            }
        }
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => Err(provider_error(
            GitProvider::GitLab,
            "the token cannot create private projects; grant the `api` scope.",
        )),
        status => {
            log::error!("GitLab project creation returned status {status}");
            Err(provider_error(
                GitProvider::GitLab,
                "the private repository could not be created.",
            ))
        }
    }
}

#[derive(Serialize)]
struct GiteaCreateRepository<'a> {
    name: &'a str,
    description: &'a str,
    private: bool,
    auto_init: bool,
}

async fn create_gitea_repository(
    base_url: &str,
    token: &str,
    name: &str,
    description: &str,
) -> AppResult<CreateRepositoryOutcome> {
    let response = client()?
        .post(format!("{base_url}/api/v1/user/repos"))
        .header("Authorization", format!("token {token}"))
        .json(&GiteaCreateRepository {
            name,
            description,
            private: true,
            auto_init: false,
        })
        .send()
        .await?;
    match response.status() {
        StatusCode::CREATED => Ok(CreateRepositoryOutcome::Created(
            response.json::<GiteaRepository>().await?.into(),
        )),
        StatusCode::CONFLICT => Ok(CreateRepositoryOutcome::NameTaken),
        StatusCode::UNPROCESSABLE_ENTITY => {
            let body = response.text().await.unwrap_or_default().to_lowercase();
            if body.contains("already exists") || body.contains("already been taken") {
                Ok(CreateRepositoryOutcome::NameTaken)
            } else {
                log::error!("Gitea rejected repository creation with status 422");
                Err(provider_error(
                    GitProvider::Gitea,
                    "the repository settings were rejected by the server.",
                ))
            }
        }
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => Err(provider_error(
            GitProvider::Gitea,
            "the token cannot create private repositories; grant user and repository write access.",
        )),
        status => {
            log::error!("Gitea repository creation returned status {status}");
            Err(provider_error(
                GitProvider::Gitea,
                "the private repository could not be created.",
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_provider_urls_without_credentials() {
        assert_eq!(
            normalize_base_url(GitProvider::GitLab, Some("https://git.example.com/")).unwrap(),
            "https://git.example.com"
        );
        assert!(normalize_base_url(
            GitProvider::Gitea,
            Some("https://user:secret@git.example.com")
        )
        .is_err());
        assert!(normalize_base_url(GitProvider::Gitea, Some("http://git.example.com")).is_err());
        assert!(normalize_base_url(GitProvider::Gitea, Some("http://localhost:3000")).is_ok());
    }

    #[test]
    fn builds_encoded_clone_urls_and_rejects_traversal() {
        assert_eq!(
            repository_clone_url("https://gitlab.com", "team/sub group", "backup docs").unwrap(),
            "https://gitlab.com/team/sub%20group/backup%20docs.git"
        );
        assert!(repository_clone_url("https://gitlab.com", "team/../admin", "backup").is_err());
        assert!(repository_clone_url("https://gitlab.com", "team", "../backup").is_err());
    }

    #[test]
    fn reads_gitlab_and_gitea_repository_shapes() {
        let gitlab: GitLabProject = serde_json::from_str(
            r#"{
                "name":"Backup",
                "path_with_namespace":"team/backup",
                "web_url":"https://gitlab.com/team/backup",
                "http_url_to_repo":"https://gitlab.com/team/backup.git",
                "visibility":"private",
                "default_branch":"main",
                "namespace":{"full_path":"team"}
            }"#,
        )
        .unwrap();
        let gitea: GiteaRepository = serde_json::from_str(
            r#"{
                "name":"backup",
                "full_name":"alice/backup",
                "html_url":"https://codeberg.org/alice/backup",
                "clone_url":"https://codeberg.org/alice/backup.git",
                "private":true,
                "default_branch":"main",
                "owner":{"login":"alice"},
                "permissions":{"push":true}
            }"#,
        )
        .unwrap();

        assert_eq!(ProviderRepository::from(gitlab).owner, "team");
        assert_eq!(ProviderRepository::from(gitea).full_name, "alice/backup");
    }

    #[test]
    fn filters_explicitly_read_only_gitea_repositories() {
        let repository: GiteaRepository = serde_json::from_str(
            r#"{
                "name":"read-only",
                "full_name":"team/read-only",
                "html_url":"https://codeberg.org/team/read-only",
                "clone_url":"https://codeberg.org/team/read-only.git",
                "private":false,
                "default_branch":"main",
                "owner":{"login":"team"},
                "permissions":{"push":false}
            }"#,
        )
        .unwrap();

        assert!(!repository.can_push());
    }
}
