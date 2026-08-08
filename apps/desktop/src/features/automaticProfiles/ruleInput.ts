import type {
	AutomaticProfileRule,
	SaveAutomaticProfileRuleInput,
} from "@/types";

export function automaticRuleInput(
	rule: AutomaticProfileRule,
): SaveAutomaticProfileRuleInput {
	return {
		name: rule.name,
		rootPath: rule.rootPath,
		integrationAccountId: rule.integrationAccountId,
		branch: rule.branch,
		excludeProfileId: rule.excludeProfileId,
		backupTime: rule.backupTime,
		backupOnStartup: rule.backupOnStartup,
		notificationsEnabled: rule.notificationsEnabled,
		continuousBackupEnabled: rule.continuousBackupEnabled,
		changeDebounceSeconds: rule.changeDebounceSeconds,
		aiAccountId: rule.aiAccountId,
		aiMajorCommitMessagesEnabled: rule.aiMajorCommitMessagesEnabled,
		aiFastCommitMessagesEnabled: rule.aiFastCommitMessagesEnabled,
		autoCreateRepositories: rule.autoCreateRepositories,
		enabled: rule.enabled,
	};
}
