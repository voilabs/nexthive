import { invokeCommand } from "@/lib/tauri";
import type {
	AutomaticProfileRule,
	AutomaticProfileSyncResult,
	SaveAutomaticProfileRuleInput,
} from "@/types";

export const automaticProfilesApi = {
	list(): Promise<AutomaticProfileRule[]> {
		return invokeCommand("list_automatic_profile_rules");
	},

	create(
		input: SaveAutomaticProfileRuleInput,
	): Promise<AutomaticProfileSyncResult> {
		return invokeCommand("create_automatic_profile_rule", { input });
	},

	update(
		id: number,
		input: SaveAutomaticProfileRuleInput,
	): Promise<AutomaticProfileRule> {
		return invokeCommand("update_automatic_profile_rule", { id, input });
	},

	sync(id: number): Promise<AutomaticProfileSyncResult> {
		return invokeCommand("sync_automatic_profile_rule", { id });
	},

	remove(id: number): Promise<void> {
		return invokeCommand("delete_automatic_profile_rule", { id });
	},
};
