import { useState } from "react";
import { Link } from "react-router";
import {
  ChevronRight,
  Folder,
  FolderCog,
  GitBranch,
  Server,
  Loader2,
  UploadCloud,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { profilesApi } from "@/features/profiles/api";
import { useTranslation } from "@/i18n";
import { useIntegrationsStore } from "@/stores/integrations";
import { useProfilesStore } from "@/stores/profiles";
import { stageLabel, useRuntimeStore } from "@/stores/runtime";
import { toAppError, type AppError } from "@/types/errors";
import type { BackupProfile, BackupSource } from "@/types";
import { SettingsRow } from "@/pages/SettingsPage";

const NO_SOURCES: BackupSource[] = [];

interface ProfileCardProps {
  profile: BackupProfile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const { t } = useTranslation();
  const sources = useProfilesStore(
    (s) => s.sourcesByProfile[profile.id] ?? NO_SOURCES,
  );
  const accounts = useIntegrationsStore((s) => s.accounts);
  const liveStage = useRuntimeStore((s) => s.stages[profile.id]);

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const linkedAccount =
    accounts.find((a) => a.id === profile.integrationAccountId) ?? null;
  const repository =
    profile.repositoryOwner && profile.repositoryName
      ? `${profile.repositoryOwner}/${profile.repositoryName}`
      : null;
  const isRunning = liveStage !== undefined;
  const isConfigured = sources.length > 0 && (profile.targetType === "s3"
    ? profile.s3AccountId !== null
    : profile.integrationAccountId !== null && repository !== null);

  const handleBackupNow = async () => {
    setError(null);
    setStarting(true);
    try {
      await profilesApi.runBackup(profile.id);
    } catch (e) {
      setError(toAppError(e));
    } finally {
      setStarting(false);
    }
  };

  return (
    <SettingsRow>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Link
              to={`/backups/${profile.id}`}
              className="truncate text-[15px] font-medium tracking-tight transition-colors hover:text-primary"
            >
              {profile.name}
            </Link>
            <div className="flex items-center gap-1.5">
              {profile.enabled ? (
                <Badge variant="success" className="h-5 rounded-md px-1.5 text-[10px] font-medium uppercase tracking-wider">{t("common.active")}</Badge>
              ) : (
                <Badge variant="warning" className="h-5 rounded-md px-1.5 text-[10px] font-medium uppercase tracking-wider">{t("common.paused")}</Badge>
              )}
              {profile.automaticProfileRuleId !== null ? (
                <Link
                  to="/automatic-profiles"
                  title={t("profileCard.managedBy", { name: profile.automaticProfileRuleName ?? t("profileCard.managedFallback") })}
                >
                  <Badge variant="secondary" className="h-5 gap-1 rounded-md px-1.5 text-[10px] font-medium uppercase tracking-wider">
                    <FolderCog className="h-3 w-3" />
                    {t("profileCard.auto")}
                  </Badge>
                </Link>
              ) : null}
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted-foreground/80">
            <span className="flex items-center gap-1.5">
              <Folder className="h-3.5 w-3.5 text-muted-foreground/60" />
              {sources.length}{" "}
              {sources.length === 1 ? t("profileCard.folder") : t("profileCard.folders")}
            </span>
            <span className="text-muted-foreground/30">&middot;</span>
            <span className="flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-muted-foreground/60" />
              {profile.targetType === "s3"
                ? "S3"
                : linkedAccount?.label ?? t("profileCard.noAccount")}
            </span>
            <span className="text-muted-foreground/30">&middot;</span>
            <span className="flex items-center gap-1.5">
              {profile.targetType === "s3" ? <UploadCloud className="h-3.5 w-3.5 text-muted-foreground/60" /> : <GitBranch className="h-3.5 w-3.5 text-muted-foreground/60" />}
              {profile.targetType === "s3" ? profile.s3Prefix ?? "nexthive" : repository ?? t("profileCard.noRepository")}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 shadow-none transition-all hover:bg-foreground hover:text-background"
            onClick={handleBackupNow}
            disabled={isRunning || starting || !isConfigured}
            title={
              isConfigured
                ? undefined
                : t("profileCard.configureFirst")
            }
          >
            {isRunning || starting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UploadCloud className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5">{isRunning ? t("profileCard.backingUp") : t("profileCard.backup")}</span>
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground" asChild>
            <Link to={`/backups/${profile.id}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
      {isRunning && liveStage ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {stageLabel(liveStage.stage, liveStage.filesScanned)}
        </p>
      ) : null}
      {error ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <span className="truncate">{error.message}</span>
          {error.fileIssue ? (
            <Link
              to={`/backups/${profile.id}`}
              className="shrink-0 font-medium underline underline-offset-4"
            >
              {t("profileCard.resolve")}
            </Link>
          ) : null}
        </div>
      ) : null}
    </SettingsRow>
  );
}
