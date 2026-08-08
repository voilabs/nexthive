import { create } from "zustand";

import { excludesApi } from "@/features/excludes/api";
import { toAppError } from "@/types/errors";
import type { AppError, ExcludeProfile } from "@/types";

interface ExcludesState {
  profiles: ExcludeProfile[];
  isLoading: boolean;
  hasLoaded: boolean;
  error: AppError | null;
  load(): Promise<void>;
  create(name: string, description?: string): Promise<void>;
  update(id: number, name?: string, description?: string): Promise<void>;
  remove(id: number): Promise<void>;
  addRule(profileId: number, pattern: string): Promise<void>;
  setRuleEnabled(ruleId: number, enabled: boolean): Promise<void>;
  removeRule(ruleId: number): Promise<void>;
  excludeFile(sourceId: number, relativePath: string): Promise<void>;
}

export const useExcludesStore = create<ExcludesState>((set) => ({
  profiles: [],
  isLoading: false,
  hasLoaded: false,
  error: null,

  async load() {
    set({ isLoading: true, error: null });
    try {
      set({
        profiles: await excludesApi.list(),
        isLoading: false,
        hasLoaded: true,
      });
    } catch (error) {
      set({ error: toAppError(error), isLoading: false, hasLoaded: true });
    }
  },

  async create(name, description) {
    set({ profiles: await excludesApi.create(name, description) });
  },

  async update(id, name, description) {
    set({ profiles: await excludesApi.update(id, name, description) });
  },

  async remove(id) {
    set({ profiles: await excludesApi.remove(id) });
  },

  async addRule(profileId, pattern) {
    set({ profiles: await excludesApi.addRule(profileId, pattern) });
  },

  async setRuleEnabled(ruleId, enabled) {
    set({ profiles: await excludesApi.setRuleEnabled(ruleId, enabled) });
  },

  async removeRule(ruleId) {
    set({ profiles: await excludesApi.removeRule(ruleId) });
  },

  async excludeFile(sourceId, relativePath) {
    set({ profiles: await excludesApi.excludeFile(sourceId, relativePath) });
  },
}));
