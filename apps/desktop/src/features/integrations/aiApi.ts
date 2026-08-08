import { invokeCommand } from "@/lib/tauri";
import type {
	AiConnectionTestResult,
	AiProviderAccount,
	CreateAiProviderAccountInput,
} from "@/types";

export const aiApi = {
	listAccounts(): Promise<AiProviderAccount[]> {
		return invokeCommand("list_ai_provider_accounts");
	},

	addAccount(input: CreateAiProviderAccountInput): Promise<AiProviderAccount> {
		return invokeCommand("add_ai_provider_account", { input });
	},

	testConnection(id: number): Promise<AiConnectionTestResult> {
		return invokeCommand("test_ai_provider_connection", { id });
	},

	removeAccount(id: number): Promise<void> {
		return invokeCommand("remove_ai_provider_account", { id });
	},
};
