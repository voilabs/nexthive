export type GitProvider = "github" | "gitlab" | "gitea";
export type IntegrationAuthMethod = "pat" | "ssh";

/** Public account metadata. Credentials never cross back from Rust. */
export interface IntegrationAccount {
  id: number;
  provider: GitProvider;
  label: string;
  username: string | null;
  authMethod: IntegrationAuthMethod;
  baseUrl: string;
  avatarUrl: string | null;
  sshPublicKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddTokenAccountResult {
  account: IntegrationAccount;
  warning: string | null;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export interface RepositorySummary {
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  htmlUrl: string;
  defaultBranch: string | null;
}
