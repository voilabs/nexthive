/** Error kinds emitted by the Rust backend (see src-tauri/src/errors). */
export type AppErrorKind =
	| "validation"
	| "notFound"
	| "database"
	| "filesystem"
	| "credential"
	| "git"
	| "github"
	| "integration"
	| "ai"
	| "network"
	| "system"
	| "update"
	| "backupFile"
	| "backup"
	| "internal"
	| "unknown";

/** Safe, human-readable error payload serialized by the backend. */
export interface AppError {
	kind: AppErrorKind;
	message: string;
	fileIssue?: {
		sourceId: number;
		relativePath: string;
	};
}

export function isAppError(value: unknown): value is AppError {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as AppError).kind === "string" &&
		typeof (value as AppError).message === "string" &&
		((value as AppError).fileIssue === undefined ||
			(typeof (value as AppError).fileIssue === "object" &&
				(value as AppError).fileIssue !== null &&
				typeof (value as AppError).fileIssue?.sourceId === "number" &&
				typeof (value as AppError).fileIssue?.relativePath === "string"))
	);
}

/** Normalize any thrown value into an AppError the UI can render. */
export function toAppError(value: unknown): AppError {
	if (isAppError(value)) return value;
	if (value instanceof Error)
		return { kind: "unknown", message: value.message };
	if (typeof value === "string") return { kind: "unknown", message: value };
	return { kind: "unknown", message: "An unexpected error occurred." };
}
