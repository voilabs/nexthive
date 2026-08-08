import { Channel } from "@tauri-apps/api/core";

import { invokeCommand } from "@/lib/tauri";
import type { AppUpdate, UpdateProgressEvent } from "@/types";

export const updaterApi = {
  check(): Promise<AppUpdate | null> {
    return invokeCommand("check_for_app_update");
  },

  install(onProgress: (event: UpdateProgressEvent) => void): Promise<void> {
    const onEvent = new Channel<UpdateProgressEvent>();
    onEvent.onmessage = onProgress;
    return invokeCommand("install_app_update", { onEvent });
  },
};
