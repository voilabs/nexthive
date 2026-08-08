import { useState } from "react";
import { AlertTriangle, Loader2, ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { useExcludesStore } from "@/stores/excludes";
import { useProfilesStore } from "@/stores/profiles";
import { toAppError, type AppError } from "@/types/errors";

export function BackupProblemAlert({
  error,
  onResolved,
}: {
  error: AppError;
  onResolved?(): void;
}) {
  const { t } = useTranslation();
  const [excluding, setExcluding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const excludeFile = useExcludesStore((state) => state.excludeFile);
  const issue = error.fileIssue;

  const handleExclude = async () => {
    if (!issue) return;
    setExcluding(true);
    setActionError(null);
    try {
      await excludeFile(issue.sourceId, issue.relativePath);
      await useProfilesStore.getState().load();
      onResolved?.();
    } catch (cause) {
      setActionError(toAppError(cause).message);
    } finally {
      setExcluding(false);
    }
  };

  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/[0.06] p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("backupAlert.title")}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {error.message.replace(/^Backup failed:\s*/i, "")}
          </p>
          {issue ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-background/70 px-3 py-2.5 ring-1 ring-inset ring-border/70">
              <code className="min-w-0 select-text truncate text-xs" title={issue.relativePath}>
                {issue.relativePath}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleExclude()}
                disabled={excluding}
              >
                {excluding ? <Loader2 className="animate-spin" /> : <ShieldOff />}
                {t("backupAlert.exclude")}
              </Button>
            </div>
          ) : null}
          {issue ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("backupAlert.note")}
            </p>
          ) : null}
          {actionError ? (
            <p className="mt-2 text-xs text-destructive">{actionError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
