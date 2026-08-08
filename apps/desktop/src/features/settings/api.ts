import { invokeCommand } from "@/lib/tauri";
import type {
  AppSettings,
  DatabaseHealthReport,
  DatabaseRepairResult,
  UpdateAppSettingsInput,
} from "@/types";

export const settingsApi = {
  get(): Promise<AppSettings> {
    return invokeCommand("get_app_settings");
  },

  update(input: UpdateAppSettingsInput): Promise<AppSettings> {
    return invokeCommand("update_app_settings", { input });
  },

  databaseHealth(): Promise<DatabaseHealthReport> {
    return invokeCommand("get_database_health");
  },

  repairDatabase(): Promise<DatabaseRepairResult> {
    return invokeCommand("repair_database");
  },
};
