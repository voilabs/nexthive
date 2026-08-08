import {
  Cloud,
  CloudCog,
  GitFork,
  Github,
  Gitlab,
  HardDrive,
  ServerCog,
  type LucideIcon,
} from "lucide-react";

import type { GitProvider } from "@/types";

export interface ProviderDefinition {
  id: GitProvider;
  category: "git";
  status: "available";
  name: string;
  shortDescription: string;
  detailDescription: string;
  defaultBaseUrl: string;
  baseUrlLabel: string;
  tokenName: string;
  tokenPermissions: string;
  tokenPath: string;
  supportsSsh: boolean;
  icon: LucideIcon;
}

export const PROVIDERS: ProviderDefinition[] = [
  {
    id: "github",
    category: "git",
    status: "available",
    name: "GitHub",
    shortDescription: "Private GitHub repositories",
    detailDescription:
      "Push dated backups to private GitHub repositories. Multiple personal and work accounts are supported.",
    defaultBaseUrl: "https://github.com",
    baseUrlLabel: "GitHub",
    tokenName: "Personal access token",
    tokenPermissions:
      "Use a classic token with the repo scope, or a fine-grained token with repository contents and administration access.",
    tokenPath: "github.com/settings/tokens",
    supportsSsh: true,
    icon: Github,
  },
  {
    id: "gitlab",
    category: "git",
    status: "available",
    name: "GitLab",
    shortDescription: "GitLab.com or self-managed",
    detailDescription:
      "Use GitLab.com or your own GitLab server for private, dated backup projects.",
    defaultBaseUrl: "https://gitlab.com",
    baseUrlLabel: "GitLab server",
    tokenName: "Personal access token",
    tokenPermissions:
      "The token needs the api scope to validate the account, list projects, create private projects and push backups.",
    tokenPath: "/-/user_settings/personal_access_tokens",
    supportsSsh: false,
    icon: Gitlab,
  },
  {
    id: "gitea",
    category: "git",
    status: "available",
    name: "Gitea / Forgejo",
    shortDescription: "Self-hosted Git and Codeberg",
    detailDescription:
      "Connect a Gitea, Forgejo or Codeberg server and keep backups in repositories you control.",
    defaultBaseUrl: "https://codeberg.org",
    baseUrlLabel: "Gitea / Forgejo server",
    tokenName: "Access token",
    tokenPermissions:
      "Grant user read access and repository write access. Restrict the token to only the repositories NextHive needs when your server supports it.",
    tokenPath: "/user/settings/applications",
    supportsSsh: false,
    icon: GitFork,
  },
];

export type StorageIntegrationId =
  | "google-drive"
  | "yandex-disk"
  | "mega"
  | "ftp";

export type IntegrationId = GitProvider | StorageIntegrationId;

export interface PlannedIntegrationDefinition {
  id: StorageIntegrationId;
  category: "cloud" | "server";
  status: "coming-next";
  name: string;
  shortDescription: string;
  detailDescription: string;
  connectionLabel: string;
  connectionDescription: string;
  destinationLayout: string;
  safeguards: string[];
  icon: LucideIcon;
}

export type IntegrationDefinition =
  | ProviderDefinition
  | PlannedIntegrationDefinition;

export const STORAGE_INTEGRATIONS: PlannedIntegrationDefinition[] = [
  {
    id: "google-drive",
    category: "cloud",
    status: "coming-next",
    name: "Google Drive",
    shortDescription: "Private cloud folders through Google OAuth",
    detailDescription:
      "Store dated backup snapshots in a dedicated Google Drive folder without asking for your Google password.",
    connectionLabel: "OAuth 2.0 for desktop",
    connectionDescription:
      "NextHive will open the system browser, request only the Drive access it needs, and keep refresh credentials in the operating-system vault.",
    destinationLayout: "NextHive/<profile-name>/<date>/",
    safeguards: [
      "Use the app-scoped drive.file permission instead of full Drive access",
      "Resumable uploads for large backup archives",
      "Failed uploads remain failed and are safe to retry",
    ],
    icon: HardDrive,
  },
  {
    id: "yandex-disk",
    category: "cloud",
    status: "coming-next",
    name: "Yandex Disk",
    shortDescription: "Yandex Disk backup folders through OAuth",
    detailDescription:
      "Deliver dated backup snapshots to a dedicated folder in Yandex Disk through its official API.",
    connectionLabel: "Yandex OAuth",
    connectionDescription:
      "Authorization happens in the browser. Access tokens stay in the operating-system vault and are never returned to React.",
    destinationLayout: "NextHive/<profile-name>/<date>/",
    safeguards: [
      "Request only the disk permissions required for backup delivery",
      "Check upload completion before confirming a backup run",
      "Preserve provider errors as safe, actionable messages",
    ],
    icon: Cloud,
  },
  {
    id: "mega",
    category: "cloud",
    status: "coming-next",
    name: "MEGA",
    shortDescription: "Encrypted cloud storage through the official SDK",
    detailDescription:
      "Upload dated backup snapshots with MEGA's official client SDK and user-controlled encryption model.",
    connectionLabel: "MEGA SDK session",
    connectionDescription:
      "Authentication and encryption stay in the Rust backend. Passwords and session material will never enter frontend state or SQLite.",
    destinationLayout: "NextHive/<profile-name>/<date>/",
    safeguards: [
      "Use the official MEGA SDK instead of shelling out to MEGAcmd",
      "Store session material only in the operating-system vault",
      "Handle Windows filename collisions before upload",
    ],
    icon: CloudCog,
  },
  {
    id: "ftp",
    category: "server",
    status: "coming-next",
    name: "SFTP / FTPS",
    shortDescription: "Your own NAS, server or hosting account",
    detailDescription:
      "Send dated backup snapshots to a remote server you control, with encrypted transports enabled by default.",
    connectionLabel: "SFTP key or FTPS credentials",
    connectionDescription:
      "SFTP and explicit FTPS will be supported first. Unencrypted plain FTP will be disabled by default and require an explicit risk acknowledgement.",
    destinationLayout: "<remote-root>/<profile-name>/<date>/",
    safeguards: [
      "Verify SSH host keys or TLS certificates before transferring data",
      "Keep passwords and private-key passphrases in the OS credential vault",
      "Upload to temporary names and finalize only after verification",
    ],
    icon: ServerCog,
  },
];

export const INTEGRATIONS: IntegrationDefinition[] = [
  ...PROVIDERS,
  ...STORAGE_INTEGRATIONS,
];

export function getProvider(provider: GitProvider): ProviderDefinition {
  return PROVIDERS.find((item) => item.id === provider) ?? PROVIDERS[0];
}

export function isGitProvider(value: string | undefined): value is GitProvider {
  return value === "github" || value === "gitlab" || value === "gitea";
}

export function isIntegrationId(
  value: string | undefined,
): value is IntegrationId {
  return INTEGRATIONS.some((integration) => integration.id === value);
}

export function getIntegration(
  integration: IntegrationId,
): IntegrationDefinition {
  return (
    INTEGRATIONS.find((item) => item.id === integration) ?? INTEGRATIONS[0]
  );
}
