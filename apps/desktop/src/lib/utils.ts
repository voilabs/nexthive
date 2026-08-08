import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { AppLanguage } from "@/types";

let displayLocale: string | undefined;
let displayTimeZone: string | undefined;
let fixedOffsetMinutes: number | null = null;

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function setFormattingPreferences(
	language: AppLanguage,
	timeZone: string,
) {
	displayLocale = language === "system" ? undefined : language;
	fixedOffsetMinutes = parseFixedOffset(timeZone);
	displayTimeZone = timeZone === "system" ? undefined : "UTC";
}

function parseFixedOffset(timeZone: string): number | null {
	if (timeZone === "system") return null;
	if (timeZone === "UTC") return 0;
	const match = /^UTC([+-])(\d{2}):(\d{2})$/.exec(timeZone);
	if (!match) return null;
	const minutes = Number(match[2]) * 60 + Number(match[3]);
	return match[1] === "+" ? minutes : -minutes;
}

function dateInConfiguredZone(date: Date): Date {
	return fixedOffsetMinutes === null
		? date
		: new Date(date.getTime() + fixedOffsetMinutes * 60_000);
}

/** Format an ISO timestamp for display in the UI. */
export function formatDateTime(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return new Intl.DateTimeFormat(displayLocale, {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: displayTimeZone,
	}).format(dateInConfiguredZone(date));
}

export function formatNumber(value: number): string {
	return new Intl.NumberFormat(displayLocale).format(value);
}

/** Format a byte count as a human readable string. */
export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${formatNumber(bytes)} B`;
	const units = ["KB", "MB", "GB", "TB"];
	let value = bytes;
	let unit = -1;
	do {
		value /= 1024;
		unit += 1;
	} while (value >= 1024 && unit < units.length - 1);
	return `${new Intl.NumberFormat(displayLocale, {
		maximumFractionDigits: value >= 100 ? 0 : 1,
	}).format(value)} ${units[unit]}`;
}
