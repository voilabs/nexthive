import { invokeCommand } from "@/lib/tauri";
import type {
  BackupProfile,
  BackupRun,
  BackupSettings,
  BackupSource,
  CreateBackupProfileInput,
  UpdateBackupProfileInput,
  UpdateBackupSettingsInput,
} from "@/types";

/** Typed wrappers around the backup-profile Tauri commands. */
export const profilesApi = {
  list(): Promise<BackupProfile[]> {
    return invokeCommand("list_backup_profiles");
  },

  create(input: CreateBackupProfileInput): Promise<BackupProfile> {
    return invokeCommand("create_backup_profile", { input });
  },

  update(id: number, input: UpdateBackupProfileInput): Promise<BackupProfile> {
    return invokeCommand("update_backup_profile", { id, input });
  },

  remove(id: number): Promise<void> {
    return invokeCommand("delete_backup_profile", { id });
  },

  /** Auto-create the nexthive-<profile-name> private repo on the linked provider. */
  createRepository(id: number): Promise<BackupProfile> {
    return invokeCommand("create_profile_repository", { id });
  },

  listSources(): Promise<BackupSource[]> {
    return invokeCommand("list_backup_sources");
  },

  addSource(
    profileId: number,
    path: string,
    excludeProfileId: number | null = null,
  ): Promise<BackupSource> {
    return invokeCommand("add_backup_source", {
      profileId,
      path,
      excludeProfileId,
    });
  },

  setSourceExcludeProfile(
    sourceId: number,
    excludeProfileId: number | null,
  ): Promise<BackupSource> {
    return invokeCommand("set_source_exclude_profile", {
      sourceId,
      excludeProfileId,
    });
  },

  removeSource(id: number): Promise<void> {
    return invokeCommand("remove_backup_source", { id });
  },

  runBackup(profileId: number): Promise<BackupRun> {
    return invokeCommand("run_manual_backup", { profileId });
  },

  listRuns(profileId?: number, limit?: number): Promise<BackupRun[]> {
    return invokeCommand("list_backup_runs", { profileId, limit });
  },

  getSettings(profileId: number): Promise<BackupSettings> {
    return invokeCommand("get_backup_settings", { profileId });
  },

  updateSettings(
    profileId: number,
    input: UpdateBackupSettingsInput,
  ): Promise<BackupSettings> {
    return invokeCommand("update_backup_settings", { profileId, input });
  },
};
