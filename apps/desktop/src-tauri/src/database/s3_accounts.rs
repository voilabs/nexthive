use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::errors::{AppError, AppResult};
use crate::models::S3Account;

const COLUMNS: &str = "id, label, endpoint, region, bucket, path_style, created_at, updated_at";

fn row(row: &Row) -> rusqlite::Result<S3Account> {
    Ok(S3Account {
        id: row.get("id")?,
        label: row.get("label")?,
        endpoint: row.get("endpoint")?,
        region: row.get("region")?,
        bucket: row.get("bucket")?,
        path_style: row.get::<_, i64>("path_style")? != 0,
        created_at: row.get::<_, DateTime<Utc>>("created_at")?,
        updated_at: row.get::<_, DateTime<Utc>>("updated_at")?,
    })
}

pub fn list(conn: &Connection) -> AppResult<Vec<S3Account>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {COLUMNS} FROM s3_accounts ORDER BY created_at, id"
    ))?;
    let accounts = stmt.query_map([], row)?.collect::<Result<Vec<_>, _>>()?;
    Ok(accounts)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<S3Account> {
    conn.query_row(
        &format!("SELECT {COLUMNS} FROM s3_accounts WHERE id = ?1"),
        [id],
        row,
    )
    .optional()?
    .ok_or(AppError::NotFound("S3 account"))
}

pub fn insert(
    conn: &Connection,
    label: &str,
    endpoint: Option<&str>,
    region: &str,
    bucket: &str,
    path_style: bool,
) -> AppResult<S3Account> {
    let now = Utc::now();
    conn.execute(
        "INSERT INTO s3_accounts (label, endpoint, region, bucket, path_style, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![label, endpoint, region, bucket, i64::from(path_style), now],
    )?;
    get(conn, conn.last_insert_rowid())
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    if conn.execute("DELETE FROM s3_accounts WHERE id = ?1", [id])? == 0 {
        return Err(AppError::NotFound("S3 account"));
    }
    Ok(())
}

pub fn exists(conn: &Connection, id: i64) -> AppResult<bool> {
    Ok(conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM s3_accounts WHERE id = ?1)",
        [id],
        |r| r.get(0),
    )?)
}
