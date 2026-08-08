//! Small built-in Git LFS client used for files that regular GitHub pushes
//! cannot accept. NextHive implements the standard Batch + basic transfer
//! protocol, so no system Git or Git LFS installation is required.

use std::collections::HashMap;
use std::fs::File;
use std::path::Path;
use std::time::Duration;

use reqwest::blocking::{Body, Client};
use reqwest::header::{HeaderName, HeaderValue, ACCEPT, CONTENT_LENGTH, CONTENT_TYPE};
use serde::{Deserialize, Serialize};

use crate::errors::{AppError, AppResult};

const LFS_MEDIA_TYPE: &str = "application/vnd.git-lfs+json";
const USER_AGENT: &str = concat!("NextHive/", env!("CARGO_PKG_VERSION"));

#[derive(Serialize)]
struct BatchRequest<'a> {
    operation: &'static str,
    transfers: [&'static str; 1],
    #[serde(rename = "ref")]
    git_ref: BatchRef<'a>,
    objects: [BatchObject<'a>; 1],
    hash_algo: &'static str,
}

#[derive(Serialize)]
struct BatchRef<'a> {
    name: &'a str,
}

#[derive(Serialize)]
struct BatchObject<'a> {
    oid: &'a str,
    size: i64,
}

#[derive(Deserialize)]
struct BatchResponse {
    #[serde(default)]
    objects: Vec<ResponseObject>,
}

#[derive(Deserialize)]
struct ResponseObject {
    oid: String,
    #[serde(default)]
    actions: Option<ResponseActions>,
    #[serde(default)]
    error: Option<ObjectError>,
}

#[derive(Deserialize)]
struct ResponseActions {
    #[serde(default)]
    upload: Option<Action>,
    #[serde(default)]
    verify: Option<Action>,
}

#[derive(Deserialize)]
struct Action {
    href: String,
    #[serde(default)]
    header: HashMap<String, String>,
}

#[derive(Deserialize)]
struct ObjectError {
    code: u16,
    message: String,
}

fn client() -> AppResult<Client> {
    Ok(Client::builder()
        .user_agent(USER_AGENT)
        .connect_timeout(Duration::from_secs(20))
        .timeout(Duration::from_secs(60 * 60))
        .build()?)
}

fn apply_action_headers(
    mut request: reqwest::blocking::RequestBuilder,
    headers: &HashMap<String, String>,
) -> AppResult<reqwest::blocking::RequestBuilder> {
    for (name, value) in headers {
        let name = HeaderName::from_bytes(name.as_bytes())
            .map_err(|error| AppError::internal(format!("invalid LFS action header: {error}")))?;
        let value = HeaderValue::from_str(value)
            .map_err(|error| AppError::internal(format!("invalid LFS action value: {error}")))?;
        request = request.header(name, value);
    }
    Ok(request)
}

fn lfs_service_error(status: reqwest::StatusCode) -> AppError {
    log::error!("Git LFS service returned HTTP {status}");
    match status.as_u16() {
        401 | 403 => AppError::GitHub(
            "GitHub did not allow this Git LFS upload. Check the token's repository access."
                .into(),
        ),
        413 | 422 => AppError::GitHub(
            "GitHub rejected this file for Git LFS, likely because of its size or repository policy."
                .into(),
        ),
        429 | 507 | 509 => AppError::GitHub(
            "GitHub LFS storage is currently unavailable or its quota has been reached.".into(),
        ),
        _ => AppError::GitHub(format!(
            "GitHub LFS returned an unexpected response ({status})."
        )),
    }
}

/// Ensure one SHA-256 object exists in GitHub LFS. The source path must be
/// the immutable local LFS object, not the user's original file.
pub fn upload_object(
    owner: &str,
    repository: &str,
    branch: &str,
    token: &str,
    oid: &str,
    size: i64,
    object_path: &Path,
) -> AppResult<()> {
    let client = client()?;
    let batch_url = format!("https://github.com/{owner}/{repository}.git/info/lfs/objects/batch");
    let git_ref = format!("refs/heads/{branch}");
    let response = client
        .post(batch_url)
        .basic_auth("x-access-token", Some(token))
        .header(ACCEPT, LFS_MEDIA_TYPE)
        .header(CONTENT_TYPE, LFS_MEDIA_TYPE)
        .json(&BatchRequest {
            operation: "upload",
            transfers: ["basic"],
            git_ref: BatchRef { name: &git_ref },
            objects: [BatchObject { oid, size }],
            hash_algo: "sha256",
        })
        .send()?;

    let status = response.status();
    if !status.is_success() {
        return Err(lfs_service_error(status));
    }
    let response: BatchResponse = response.json().map_err(|error| {
        log::error!("invalid Git LFS batch response: {error}");
        AppError::GitHub("GitHub LFS returned an unreadable response.".into())
    })?;
    let object = response
        .objects
        .into_iter()
        .find(|object| object.oid == oid)
        .ok_or_else(|| AppError::GitHub("GitHub LFS did not acknowledge this file.".into()))?;

    if let Some(error) = object.error {
        log::error!(
            "Git LFS object rejected ({}): {}",
            error.code,
            error.message
        );
        return Err(lfs_service_error(
            reqwest::StatusCode::from_u16(error.code)
                .unwrap_or(reqwest::StatusCode::UNPROCESSABLE_ENTITY),
        ));
    }
    let Some(actions) = object.actions else {
        return Ok(()); // The object already exists remotely.
    };

    if let Some(upload) = actions.upload {
        let file = File::open(object_path)?;
        let request = client
            .put(&upload.href)
            .header(CONTENT_TYPE, "application/octet-stream")
            .header(CONTENT_LENGTH, size)
            .body(Body::new(file));
        let response = apply_action_headers(request, &upload.header)?.send()?;
        if !response.status().is_success() {
            return Err(lfs_service_error(response.status()));
        }
    }

    if let Some(verify) = actions.verify {
        let request = client
            .post(&verify.href)
            .header(ACCEPT, LFS_MEDIA_TYPE)
            .header(CONTENT_TYPE, LFS_MEDIA_TYPE)
            .json(&BatchObject { oid, size });
        let response = apply_action_headers(request, &verify.header)?.send()?;
        if !response.status().is_success() {
            return Err(lfs_service_error(response.status()));
        }
    }
    Ok(())
}
