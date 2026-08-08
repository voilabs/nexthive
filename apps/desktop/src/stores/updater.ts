import { create } from "zustand";

import { updaterApi } from "@/features/updater/api";
import type { AppError, AppUpdate, AppUpdateStatus } from "@/types";
import { toAppError } from "@/types/errors";

interface UpdateState {
  status: AppUpdateStatus;
  update: AppUpdate | null;
  downloadedBytes: number;
  totalBytes: number | null;
  lastCheckedAt: string | null;
  automaticCheckAttempted: boolean;
  error: AppError | null;
  check(silent?: boolean): Promise<void>;
  install(): Promise<void>;
}

const BUSY_STATUSES: AppUpdateStatus[] = ["checking", "downloading", "installing"];

export const useUpdaterStore = create<UpdateState>((set, get) => ({
  status: "idle",
  update: null,
  downloadedBytes: 0,
  totalBytes: null,
  lastCheckedAt: null,
  automaticCheckAttempted: false,
  error: null,

  async check(silent = false) {
    if (BUSY_STATUSES.includes(get().status)) return;
    if (silent && get().automaticCheckAttempted) return;
    set({
      status: "checking",
      error: null,
      automaticCheckAttempted: silent || get().automaticCheckAttempted,
    });

    try {
      const update = await updaterApi.check();
      set({
        update,
        status: update ? "available" : "upToDate",
        lastCheckedAt: new Date().toISOString(),
        downloadedBytes: 0,
        totalBytes: null,
      });
    } catch (cause) {
      set({
        status: silent ? "idle" : "error",
        error: silent ? null : toAppError(cause),
      });
    }
  },

  async install() {
    if (!get().update || BUSY_STATUSES.includes(get().status)) return;
    set({
      status: "downloading",
      downloadedBytes: 0,
      totalBytes: null,
      error: null,
    });

    try {
      await updaterApi.install((event) => {
        if (event.event === "started") {
          set({ totalBytes: event.data.contentLength });
        } else if (event.event === "progress") {
          set((state) => ({
            downloadedBytes: state.downloadedBytes + event.data.chunkLength,
          }));
        } else {
          set({ status: "installing" });
        }
      });
      set({ status: "installing" });
    } catch (cause) {
      set({ status: "error", error: toAppError(cause) });
    }
  },
}));
