import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

import { useProfilesStore } from "@/stores/profiles";
import { useRuntimeStore } from "@/stores/runtime";
import type {
  BackupCompletedEvent,
  BackupFailedEvent,
  BackupProgressEvent,
} from "@/types";

/** Subscribes to backend backup events. Mount exactly once (in App). */
export function useBackupEvents() {
  useEffect(() => {
    const runtime = useRuntimeStore.getState();
    const unlisteners = [
      listen<BackupProgressEvent>("backup-progress", (event) => {
        const { profileId, stage, filesScanned } = event.payload;
        useRuntimeStore
          .getState()
          .setStage(profileId, stage, filesScanned ?? null);
      }),
      listen<BackupCompletedEvent>("backup-completed", (event) => {
        const { profileId, run } = event.payload;
        const changed = run.filesAdded + run.filesModified + run.filesDeleted;
        useRuntimeStore
          .getState()
          .finishBackup(
            profileId,
            "completed",
            changed === 0
              ? "Backup finished — no changes"
              : `Backup finished — ${changed} file${changed === 1 ? "" : "s"} changed`,
          );
      }),
      listen<BackupFailedEvent>("backup-failed", (event) => {
        const { profileId, message, fileIssue } = event.payload;
        useRuntimeStore
          .getState()
          .finishBackup(
            profileId,
            "failed",
            `Backup failed: ${message}`,
            fileIssue,
          );
      }),
    ];
    void runtime; // established before listeners resolve

    return () => {
      for (const promise of unlisteners) {
        promise.then((unlisten) => unlisten()).catch(() => {});
      }
    };
  }, []);

  // Refresh profile/source data after every finished run (a successful
  // backup can be the profile's first, changing dashboard state).
  const runsVersion = useRuntimeStore((s) => s.runsVersion);
  useEffect(() => {
    if (runsVersion > 0) {
      void useProfilesStore.getState().load();
    }
  }, [runsVersion]);
}
