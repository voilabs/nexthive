import { useEffect, useState } from "react";

import { History, Loader2 } from "lucide-react";

import { useTranslation } from "@/i18n";

import { EmptyState } from "@/components/EmptyState";
import { RunsList } from "@/components/RunsList";
import { profilesApi } from "@/features/profiles/api";
import { useRuntimeStore } from "@/stores/runtime";
import { toAppError } from "@/types/errors";
import type { BackupRun } from "@/types";

export function HistoryTab({ profileId }: { profileId: number }) {
  const { t } = useTranslation();
  const runsVersion = useRuntimeStore((s) => s.runsVersion);
  const [runs, setRuns] = useState<BackupRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    profilesApi
      .listRuns(profileId, 100)
      .then((result) => {
        if (!cancelled) setRuns(result);
      })
      .catch((e) => {
        if (!cancelled) setError(toAppError(e).message);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId, runsVersion]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (runs === null) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (runs.length === 0) {
    return (
      <EmptyState
        icon={History}
        title={t("profileHistory.emptyTitle")}
        description={t("profileHistory.emptyDescription")}
      />
    );
  }
  return <RunsList runs={runs} />;
}

