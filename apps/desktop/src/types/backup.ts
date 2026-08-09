/**
 * Domain types mirroring the Rust models in src-tauri/src/models.
 * All timestamps are RFC 3339 / ISO 8601 strings in UTC.
 */

export interface BackupProfile {
	id: number;
	name: string;
	repositoryOwner: string | null;
	repositoryName: string | null;
	repositoryUrl: string | null;
	branch: string;
	enabled: boolean;
	integrationAccountId: number | null;
	targetType: "git" | "s3";
	s3AccountId: number | null;
	s3Prefix: string | null;
	automaticProfileRuleId: number | null;
	automaticProfileRuleName: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface BackupSource {
	id: number;
	profileId: number;
	path: string;
	enabled: boolean;
	excludeProfileId: number | null;
	scanMode: "recursive" | "directFiles";
	createdAt: string;
}

export interface ExcludeRule {
	id: number;
	excludeProfileId: number;
	kind: "glob" | "exact";
	pattern: string;
	enabled: boolean;
	createdAt: string;
}

export interface ExcludeProfile {
	id: number;
	name: string;
	description: string | null;
	createdAt: string;
	updatedAt: string;
	/** Number of source folders currently using this profile. */
	usedBy: number;
	rules: ExcludeRule[];
}

export interface FileSnapshot {
	id: number;
	sourceId: number;
	relativePath: string;
	hash: string;
	size: number;
	modifiedAt: string;
	lastSeenAt: string;
}

export type BackupRunStatus = "running" | "success" | "failed" | "cancelled";

export interface BackupRun {
	id: number;
	profileId: number;
	startedAt: string;
	completedAt: string | null;
	status: BackupRunStatus;
	filesAdded: number;
	filesModified: number;
	filesDeleted: number;
	bytesProcessed: number;
	commitSha: string | null;
	errorMessage: string | null;
}

export interface BackupSettings {
	profileId: number;
	/** "HH:MM" in the configured app time zone, or null when disabled. */
	backupTime: string | null;
	backupOnStartup: boolean;
	autostartEnabled: boolean;
	notificationsEnabled: boolean;
	continuousBackupEnabled: boolean;
	changeDebounceSeconds: number;
	aiAccountId: number | null;
	aiMajorCommitMessagesEnabled: boolean;
	aiFastCommitMessagesEnabled: boolean;
}

export interface CreateBackupProfileInput {
	name: string;
	targetType?: "git" | "s3";
	repositoryOwner?: string | null;
	repositoryName?: string | null;
	repositoryUrl?: string | null;
	branch?: string | null;
	integrationAccountId?: number | null;
	s3AccountId?: number | null;
	s3Prefix?: string | null;
}

/** Fields left undefined are not modified; `null` clears the field. */
export interface UpdateBackupProfileInput {
	name?: string;
	repositoryOwner?: string | null;
	repositoryName?: string | null;
	repositoryUrl?: string | null;
	branch?: string;
	enabled?: boolean;
	/** Omit = unchanged, `null` = unlink, number = link to that account. */
	integrationAccountId?: number | null;
	s3AccountId?: number | null;
	s3Prefix?: string | null;
}

/** Fields left undefined are not modified; `null` disables daily backup. */
export interface UpdateBackupSettingsInput {
	backupTime?: string | null;
	backupOnStartup?: boolean;
	autostartEnabled?: boolean;
	notificationsEnabled?: boolean;
	continuousBackupEnabled?: boolean;
	changeDebounceSeconds?: number;
	aiAccountId?: number | null;
	aiMajorCommitMessagesEnabled?: boolean;
	aiFastCommitMessagesEnabled?: boolean;
}

export type BackupStage =
	| "scanning"
	| "comparing"
	| "syncing"
	| "committing"
	| "pushing"
	| "uploadingLargeFiles"
	| "uploadingS3";

export interface BackupProgressEvent {
	profileId: number;
	runId: number;
	stage: BackupStage;
	filesScanned: number | null;
}

export interface BackupCompletedEvent {
	profileId: number;
	run: BackupRun;
}

export interface BackupFailedEvent {
	profileId: number;
	runId: number;
	message: string;
	fileIssue?: BackupFileIssue;
}

export interface BackupFileIssue {
	sourceId: number;
	relativePath: string;
}
