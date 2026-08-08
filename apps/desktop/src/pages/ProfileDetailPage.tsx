import { useEffect, useState } from "react";

import { useTranslation } from "@/i18n";import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Folder,
  GitBranch,
  History,
  Loader2,
  Settings2,
  UploadCloud,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BackupProblemAlert } from "@/components/BackupProblemAlert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FoldersTab } from "@/features/profiles/components/detail/FoldersTab";
import { HistoryTab } from "@/features/profiles/components/detail/HistoryTab";
import { RepositoryTab } from "@/features/profiles/components/detail/RepositoryTab";
import { SettingsTab } from "@/features/profiles/components/detail/SettingsTab";
import { profilesApi } from "@/features/profiles/api";
import { useIntegrationsStore } from "@/stores/integrations";
import { useProfilesStore } from "@/stores/profiles";
import { stageLabel, useRuntimeStore } from "@/stores/runtime";
import { toAppError, type AppError } from "@/types/errors";

export function ProfileDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ profileId: string }>();
  const profileId = Number(params.profileId);

  const { profiles, hasLoaded, load } = useProfilesStore();
  const integrationsLoaded = useIntegrationsStore((s) => s.hasLoaded);
  const loadIntegrations = useIntegrationsStore((s) => s.load);
  const liveStage = useRuntimeStore((s) => s.stages[profileId]);
  const runtimeProblem = useRuntimeStore((s) => s.problems[profileId]);
  const clearRuntimeProblem = useRuntimeStore((s) => s.clearProblem);

  const [backupError, setBackupError] = useState<AppError | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!hasLoaded) void load();
  }, [hasLoaded, load]);
  useEffect(() => {
    if (!integrationsLoaded) void loadIntegrations();
  }, [integrationsLoaded, loadIntegrations]);

  const profile = profiles.find((p) => p.id === profileId);

  if (!hasLoaded) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!profile) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">
          {t("profileDetail.missing")}
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/backups">
            <ArrowLeft />
            {t("profileDetail.back")}
          </Link>
        </Button>
      </div>
    );
  }

  const isRunning = liveStage !== undefined;

  const handleBackupNow = async () => {
    setBackupError(null);
    clearRuntimeProblem(profile.id);
    setStarting(true);
    try {
      await profilesApi.runBackup(profile.id);
    } catch (e) {
      setBackupError(toAppError(e));
    } finally {
      setStarting(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    try {
      await useProfilesStore.getState().update(profile.id, { enabled });
    } catch (e) {
      setBackupError(toAppError(e));
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/backups"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("profileDetail.back")}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {profile.name}
            </h1>
            {profile.enabled ? (
              <Badge variant="success">{t("profileDetail.enabled")}</Badge>
            ) : (
              <Badge variant="secondary">{t("profileDetail.paused")}</Badge>
            )}
            <Switch
              checked={profile.enabled}
              onCheckedChange={handleToggle}
              aria-label={t("profileDetail.toggle")}
            />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Button
              size="lg"
              onClick={handleBackupNow}
              disabled={isRunning || starting}
            >
              {isRunning || starting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <UploadCloud />
              )}
              {isRunning ? t("profileDetail.backingUp") : t("profileDetail.backUpNow")}
            </Button>
            {isRunning && liveStage ? (
              <span className="text-xs text-muted-foreground">
                {stageLabel(liveStage.stage, liveStage.filesScanned)}
              </span>
            ) : null}
          </div>
        </div>
        {backupError || runtimeProblem ? (
          <div className="mt-4">
            <BackupProblemAlert
              error={
                backupError ?? {
                  kind: runtimeProblem?.fileIssue ? "backupFile" : "backup",
                  message: runtimeProblem?.message ?? t("profileDetail.backupFailed"),
                  fileIssue: runtimeProblem?.fileIssue ?? undefined,
                }
              }
              onResolved={() => {
                setBackupError(null);
                clearRuntimeProblem(profile.id);
              }}
            />
          </div>
        ) : null}
      </div>

      <Tabs defaultValue="folders">
        <TabsList>
          <TabsTrigger value="folders">
            <Folder />
            {t("profileDetail.tabs.folders")}
          </TabsTrigger>
          <TabsTrigger value="repository">
            <GitBranch />
            {t("profileDetail.tabs.repository")}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 />
            {t("profileDetail.tabs.settings")}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History />
            {t("profileDetail.tabs.history")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="folders">
          <FoldersTab profile={profile} />
        </TabsContent>
        <TabsContent value="repository">
          <RepositoryTab profile={profile} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab profile={profile} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab profileId={profile.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

