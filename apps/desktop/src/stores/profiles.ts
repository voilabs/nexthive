import { create } from "zustand";

import { profilesApi } from "@/features/profiles/api";
import { toAppError } from "@/types/errors";
import type {
  AppError,
  BackupProfile,
  BackupSource,
  CreateBackupProfileInput,
  UpdateBackupProfileInput,
} from "@/types";

interface ProfilesState {
  profiles: BackupProfile[];
  /** All sources across profiles, grouped by profile id. */
  sourcesByProfile: Record<number, BackupSource[]>;
  isLoading: boolean;
  hasLoaded: boolean;
  error: AppError | null;

  load(): Promise<void>;
  create(input: CreateBackupProfileInput): Promise<BackupProfile>;
  update(id: number, input: UpdateBackupProfileInput): Promise<BackupProfile>;
  remove(id: number): Promise<void>;
  createRepository(id: number): Promise<BackupProfile>;
  addSource(
    profileId: number,
    path: string,
    excludeProfileId?: number | null,
  ): Promise<BackupSource>;
  setSourceExcludeProfile(
    sourceId: number,
    excludeProfileId: number | null,
  ): Promise<BackupSource>;
  removeSource(id: number): Promise<void>;
  clearError(): void;
}

function groupSources(sources: BackupSource[]): Record<number, BackupSource[]> {
  const grouped: Record<number, BackupSource[]> = {};
  for (const source of sources) {
    (grouped[source.profileId] ??= []).push(source);
  }
  return grouped;
}

export const useProfilesStore = create<ProfilesState>((set) => ({
  profiles: [],
  sourcesByProfile: {},
  isLoading: false,
  hasLoaded: false,
  error: null,

  async load() {
    set({ isLoading: true, error: null });
    try {
      const [profiles, sources] = await Promise.all([
        profilesApi.list(),
        profilesApi.listSources(),
      ]);
      set({
        profiles,
        sourcesByProfile: groupSources(sources),
        isLoading: false,
        hasLoaded: true,
      });
    } catch (error) {
      set({ error: toAppError(error), isLoading: false, hasLoaded: true });
    }
  },

  async create(input) {
    const profile = await profilesApi.create(input);
    set((state) => ({ profiles: [...state.profiles, profile] }));
    return profile;
  },

  async update(id, input) {
    const updated = await profilesApi.update(id, input);
    set((state) => ({
      profiles: state.profiles.map((p) => (p.id === id ? updated : p)),
    }));
    return updated;
  },

  async createRepository(id) {
    const updated = await profilesApi.createRepository(id);
    set((state) => ({
      profiles: state.profiles.map((p) => (p.id === id ? updated : p)),
    }));
    return updated;
  },

  async remove(id) {
    await profilesApi.remove(id);
    set((state) => {
      const { [id]: _removed, ...rest } = state.sourcesByProfile;
      return {
        profiles: state.profiles.filter((p) => p.id !== id),
        sourcesByProfile: rest,
      };
    });
  },

  async addSource(profileId, path, excludeProfileId = null) {
    const source = await profilesApi.addSource(
      profileId,
      path,
      excludeProfileId,
    );
    set((state) => ({
      sourcesByProfile: {
        ...state.sourcesByProfile,
        [profileId]: [...(state.sourcesByProfile[profileId] ?? []), source],
      },
    }));
    return source;
  },

  async setSourceExcludeProfile(sourceId, excludeProfileId) {
    const updated = await profilesApi.setSourceExcludeProfile(
      sourceId,
      excludeProfileId,
    );
    set((state) => ({
      sourcesByProfile: {
        ...state.sourcesByProfile,
        [updated.profileId]: (
          state.sourcesByProfile[updated.profileId] ?? []
        ).map((source) => (source.id === sourceId ? updated : source)),
      },
    }));
    return updated;
  },

  async removeSource(id) {
    await profilesApi.removeSource(id);
    set((state) => {
      const sourcesByProfile: Record<number, BackupSource[]> = {};
      for (const [profileId, sources] of Object.entries(
        state.sourcesByProfile,
      )) {
        sourcesByProfile[Number(profileId)] = sources.filter(
          (s) => s.id !== id,
        );
      }
      return { sourcesByProfile };
    });
  },

  clearError() {
    set({ error: null });
  },
}));
