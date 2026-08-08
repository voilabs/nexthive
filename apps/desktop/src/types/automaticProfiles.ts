export type AutomaticProfileEntryKind = "root_files" | "directory";
export type AutomaticProfileMemberStatus = "active" | "missing" | "error";

export interface AutomaticProfileMember {
	id: number;
	ruleId: number;
	entryKey: string;
	entryName: string;
	entryKind: AutomaticProfileEntryKind;
	profileId: number | null;
	sourceId: number | null;
	sourcePath: string;
	status: AutomaticProfileMemberStatus;
	errorMessage: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface AutomaticProfileRule {
	id: number;
	name: string;
	rootPath: string;
	enabled: boolean;
	integrationAccountId: number | null;
	branch: string;
	excludeProfileId: number | null;
	backupTime: string | null;
	backupOnStartup: boolean;
	notificationsEnabled: boolean;
	continuousBackupEnabled: boolean;
	changeDebounceSeconds: number;
	aiAccountId: number | null;
	aiMajorCommitMessagesEnabled: boolean;
	aiFastCommitMessagesEnabled: boolean;
	autoCreateRepositories: boolean;
	lastReconciledAt: string | null;
	lastError: string | null;
	createdAt: string;
	updatedAt: string;
	members: AutomaticProfileMember[];
}

export interface SaveAutomaticProfileRuleInput {
	name: string;
	rootPath: string;
	integrationAccountId: number | null;
	branch: string | null;
	excludeProfileId: number | null;
	backupTime: string | null;
	backupOnStartup: boolean;
	notificationsEnabled: boolean;
	continuousBackupEnabled: boolean;
	changeDebounceSeconds: number;
	aiAccountId: number | null;
	aiMajorCommitMessagesEnabled: boolean;
	aiFastCommitMessagesEnabled: boolean;
	autoCreateRepositories: boolean;
	enabled: boolean;
}

export interface AutomaticProfileSyncResult {
	rule: AutomaticProfileRule;
	profilesCreated: number;
	profilesReactivated: number;
	profilesMarkedMissing: number;
	repositoriesCreated: number;
}
