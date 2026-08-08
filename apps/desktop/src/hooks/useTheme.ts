import { useEffect } from "react";

import { useSettingsStore } from "@/stores/settings";
import type { AppTheme } from "@/types";

const SYSTEM_DARK = "(prefers-color-scheme: dark)";

export function applyTheme(theme: AppTheme) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia(SYSTEM_DARK).matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

/** Keeps the root theme synchronized with the persisted Rust setting. */
export function useTheme() {
  const settings = useSettingsStore((state) => state.settings);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const load = useSettingsStore((state) => state.load);
  const theme = settings?.theme ?? "system";

  useEffect(() => {
    if (!settings && !isLoading) void load();
  }, [settings, isLoading, load]);

  useEffect(() => {
    const media = window.matchMedia(SYSTEM_DARK);
    const sync = () => applyTheme(theme);
    sync();
    if (theme !== "system") return;
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [theme]);
}
