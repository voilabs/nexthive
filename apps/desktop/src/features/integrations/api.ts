import { invokeCommand } from "@/lib/tauri";
import type {
  AddTokenAccountResult,
  ConnectionTestResult,
  GitProvider,
  IntegrationAccount,
  RepositorySummary,
} from "@/types";

export const integrationsApi = {
  listAccounts(): Promise<IntegrationAccount[]> {
    return invokeCommand("list_integration_accounts");
  },

  addTokenAccount(
    provider: GitProvider,
    label: string,
    baseUrl: string | null,
    token: string,
  ): Promise<AddTokenAccountResult> {
    return invokeCommand("add_integration_token_account", {
      provider,
      label,
      baseUrl,
      token,
    });
  },

  addSshAccount(
    provider: GitProvider,
    label: string,
  ): Promise<IntegrationAccount> {
    return invokeCommand("add_integration_ssh_account", { provider, label });
  },

  testConnection(id: number): Promise<ConnectionTestResult> {
    return invokeCommand("test_integration_connection", { id });
  },

  listRepositories(accountId: number): Promise<RepositorySummary[]> {
    return invokeCommand("list_integration_repositories", { accountId });
  },

  removeAccount(id: number): Promise<void> {
    return invokeCommand("remove_integration_account", { id });
  },
};
