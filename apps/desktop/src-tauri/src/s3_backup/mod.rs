use std::fs::File;

use s3::bucket::Bucket;
use s3::creds::Credentials;
use s3::region::Region;

use crate::credentials::{s3_access_key_id, s3_secret_access_key, CredentialStore, KeyringStore};
use crate::errors::{AppError, AppResult};
use crate::models::{CreateS3AccountInput, S3Account};
use crate::scanner::ScannedFile;

fn clean(value: &str, field: &str) -> AppResult<String> {
    let value = value.trim();
    if value.is_empty() {
        Err(AppError::Validation(format!("{field} cannot be empty.")))
    } else {
        Ok(value.to_owned())
    }
}

fn bucket(account: &S3Account, access: &str, secret: &str) -> AppResult<Box<Bucket>> {
    let region = match &account.endpoint {
        Some(endpoint) => Region::Custom {
            region: account.region.clone(),
            endpoint: endpoint.clone(),
        },
        None => account
            .region
            .parse()
            .map_err(|_| AppError::Validation("S3 region is not valid.".into()))?,
    };
    let credentials = Credentials::new(Some(access), Some(secret), None, None, None)
        .map_err(|e| AppError::internal(format!("S3 credentials: {e}")))?;
    let bucket = Bucket::new(&account.bucket, region, credentials)
        .map_err(|e| AppError::Integration(format!("S3 configuration failed: {e}")))?;
    Ok(if account.path_style {
        bucket.with_path_style()
    } else {
        bucket
    })
}

fn secrets(id: i64) -> AppResult<(String, String)> {
    let access = KeyringStore
        .get_secret(&s3_access_key_id(id))?
        .ok_or_else(|| {
            AppError::Validation("The S3 access key is missing. Reconnect this destination.".into())
        })?;
    let secret = KeyringStore
        .get_secret(&s3_secret_access_key(id))?
        .ok_or_else(|| {
            AppError::Validation("The S3 secret key is missing. Reconnect this destination.".into())
        })?;
    Ok((access, secret))
}

pub fn add(app: &tauri::AppHandle, input: CreateS3AccountInput) -> AppResult<S3Account> {
    use tauri::Manager;
    let label = clean(&input.label, "Account label")?;
    let region = clean(&input.region, "Region")?;
    let bucket_name = clean(&input.bucket, "Bucket")?;
    let access = clean(&input.access_key_id, "Access key ID")?;
    let secret = clean(&input.secret_access_key, "Secret access key")?;
    let endpoint = input
        .endpoint
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .map(str::to_owned);
    if let Some(value) = &endpoint {
        let url = reqwest::Url::parse(value)
            .map_err(|_| AppError::Validation("S3 endpoint must be a valid URL.".into()))?;
        if url.scheme() != "https"
            && url.host_str() != Some("localhost")
            && url.host_str() != Some("127.0.0.1")
        {
            return Err(AppError::Validation(
                "S3 endpoints must use HTTPS except on localhost.".into(),
            ));
        }
    }
    let state = app.state::<crate::state::AppState>();
    let account = state.db.with(|c| {
        crate::database::s3_accounts::insert(
            c,
            &label,
            endpoint.as_deref(),
            &region,
            &bucket_name,
            input.path_style,
        )
    })?;
    if let Err(error) = KeyringStore
        .save_secret(&s3_access_key_id(account.id), &access)
        .and_then(|_| KeyringStore.save_secret(&s3_secret_access_key(account.id), &secret))
    {
        let _ = state
            .db
            .with(|c| crate::database::s3_accounts::delete(c, account.id));
        return Err(error);
    }
    if let Err(error) = test_account(&account) {
        let _ = KeyringStore.delete_secret(&s3_access_key_id(account.id));
        let _ = KeyringStore.delete_secret(&s3_secret_access_key(account.id));
        let _ = state
            .db
            .with(|c| crate::database::s3_accounts::delete(c, account.id));
        return Err(error);
    }
    Ok(account)
}

pub fn test_account(account: &S3Account) -> AppResult<()> {
    let (access, secret) = secrets(account.id)?;
    let result = bucket(account, &access, &secret)?
        .list_page(String::new(), None, None, None, Some(1))
        .map_err(|e| AppError::Integration(format!("S3 connection failed: {e}")))?;
    if !(200..300).contains(&result.1) {
        return Err(AppError::Integration(format!(
            "S3 returned HTTP {}.",
            result.1
        )));
    }
    Ok(())
}

pub struct S3Uploader {
    bucket: Box<Bucket>,
}

pub fn uploader(account: &S3Account) -> AppResult<S3Uploader> {
    let (access, secret) = secrets(account.id)?;
    Ok(S3Uploader {
        bucket: bucket(account, &access, &secret)?,
    })
}

impl S3Uploader {
    pub fn upload(&self, key: &str, source_id: i64, file: &ScannedFile) -> AppResult<()> {
        let mut input = File::open(&file.absolute_path).map_err(|e| {
            AppError::backup_file(
                "A source file could not be opened for S3 upload.",
                source_id,
                &file.relative_path,
                e.to_string(),
            )
        })?;
        let status = self
            .bucket
            .put_object_stream(&mut input, key)
            .map_err(|e| {
                AppError::backup_file(
                    "A file could not be uploaded to S3.",
                    source_id,
                    &file.relative_path,
                    e.to_string(),
                )
            })?;
        if !(200..300).contains(&status) {
            return Err(AppError::backup_file(
                format!("S3 rejected a file upload (HTTP {status})."),
                source_id,
                &file.relative_path,
                "non-success S3 response",
            ));
        }
        Ok(())
    }
}
