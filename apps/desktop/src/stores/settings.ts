import { create } from "zustand";

import { settingsApi } from "@/features/settings/api";
import { toAppError } from "@/types/errors";
import type {
  AppError,
  AppSettings,
  UpdateAppSettingsInput,
} from "@/types";

interface SettingsState {
  settings: AppSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: AppError | null;
  load(): Promise<void>;
  update(input: UpdateAppSettingsInput): Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  isSaving: false,
  error: null,

  async load() {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      set({ settings: await settingsApi.get(), isLoading: false });
    } catch (cause) {
      set({ error: toAppError(cause), isLoading: false });
    }
  },

  async update(input) {
    set({ isSaving: true, error: null });
    try {
      set({ settings: await settingsApi.update(input), isSaving: false });
    } catch (cause) {
      const error = toAppError(cause);
      set({ error, isSaving: false });
      throw error;
    }
  },
}));
