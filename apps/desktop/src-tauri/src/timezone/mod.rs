//! Application time-zone preference used by scheduling and tray timestamps.
//!
//! `system` follows the operating system, including daylight-saving changes.
//! Explicit values are portable fixed UTC offsets such as `UTC+03:00`.

use chrono::{DateTime, FixedOffset, Local, NaiveDate, NaiveTime, Utc};

use crate::errors::{AppError, AppResult};

#[derive(Debug, Clone, Copy)]
pub enum ConfiguredTimeZone {
    System,
    Fixed(FixedOffset),
}

#[derive(Debug, Clone)]
pub struct ClockSnapshot {
    pub date: NaiveDate,
    pub time: NaiveTime,
    pub hhmm: String,
}

impl ConfiguredTimeZone {
    pub fn parse(value: &str) -> AppResult<Self> {
        if value == "system" {
            return Ok(Self::System);
        }
        if value == "UTC" {
            return Ok(Self::Fixed(FixedOffset::east_opt(0).expect("zero offset")));
        }

        let offset = value.strip_prefix("UTC").ok_or_else(invalid_time_zone)?;
        let (sign, value) = match offset.as_bytes().first() {
            Some(b'+') => (1, &offset[1..]),
            Some(b'-') => (-1, &offset[1..]),
            _ => return Err(invalid_time_zone()),
        };
        let (hours, minutes) = value.split_once(':').ok_or_else(invalid_time_zone)?;
        let hours: i32 = hours.parse().map_err(|_| invalid_time_zone())?;
        let minutes: i32 = minutes.parse().map_err(|_| invalid_time_zone())?;
        if hours > 14 || minutes > 59 || (hours == 14 && minutes != 0) {
            return Err(invalid_time_zone());
        }
        let seconds = sign * (hours * 3600 + minutes * 60);
        FixedOffset::east_opt(seconds)
            .map(Self::Fixed)
            .ok_or_else(invalid_time_zone)
    }

    pub fn now(self) -> ClockSnapshot {
        match self {
            Self::System => {
                let now = Local::now();
                ClockSnapshot {
                    date: now.date_naive(),
                    time: now.time(),
                    hhmm: now.format("%H:%M").to_string(),
                }
            }
            Self::Fixed(offset) => {
                let now = Utc::now().with_timezone(&offset);
                ClockSnapshot {
                    date: now.date_naive(),
                    time: now.time(),
                    hhmm: now.format("%H:%M").to_string(),
                }
            }
        }
    }

    pub fn date_for_utc(self, value: DateTime<Utc>) -> NaiveDate {
        match self {
            Self::System => value.with_timezone(&Local).date_naive(),
            Self::Fixed(offset) => value.with_timezone(&offset).date_naive(),
        }
    }

    pub fn format_for_tray(self, value: DateTime<Utc>) -> String {
        match self {
            Self::System => value
                .with_timezone(&Local)
                .format("%Y-%m-%d %H:%M")
                .to_string(),
            Self::Fixed(offset) => value
                .with_timezone(&offset)
                .format("%Y-%m-%d %H:%M")
                .to_string(),
        }
    }
}

fn invalid_time_zone() -> AppError {
    AppError::Validation(
        "Choose the system time zone or a valid UTC offset such as UTC+03:00.".into(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn parses_supported_offsets_and_rejects_invalid_values() {
        assert!(matches!(
            ConfiguredTimeZone::parse("system").unwrap(),
            ConfiguredTimeZone::System
        ));
        assert!(ConfiguredTimeZone::parse("UTC+03:00").is_ok());
        assert!(ConfiguredTimeZone::parse("UTC-05:30").is_ok());
        assert!(ConfiguredTimeZone::parse("Europe/Istanbul").is_err());
        assert!(ConfiguredTimeZone::parse("UTC+15:00").is_err());
    }

    #[test]
    fn converts_utc_dates_using_the_selected_offset() {
        let value = Utc.with_ymd_and_hms(2026, 8, 8, 22, 30, 0).unwrap();
        let zone = ConfiguredTimeZone::parse("UTC+03:00").unwrap();
        assert_eq!(zone.date_for_utc(value).to_string(), "2026-08-09");
    }
}
