import { useEffect, useState } from "react";

import { invokeCommand } from "@/lib/tauri";
import type { AppError, AppInfo } from "@/types";
import { toAppError } from "@/types/errors";

let cached: AppInfo | null = null;

/** Fetches application metadata from the backend once and caches it. */
export function useAppInfo() {
  const [info, setInfo] = useState<AppInfo | null>(cached);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    invokeCommand<AppInfo>("get_app_info")
      .then((result) => {
        cached = result;
        if (!cancelled) setInfo(result);
      })
      .catch((e) => {
        if (!cancelled) setError(toAppError(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { info, error };
}
