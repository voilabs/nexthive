import { invokeCommand } from "@/lib/tauri";
import type { ExcludeProfile } from "@/types";

export const excludesApi = {
  list(): Promise<ExcludeProfile[]> {
    return invokeCommand("list_exclude_profiles");
  },

  create(name: string, description?: string): Promise<ExcludeProfile[]> {
    return invokeCommand("create_exclude_profile", { name, description });
  },

  update(
    id: number,
    name?: string,
    description?: string,
  ): Promise<ExcludeProfile[]> {
    return invokeCommand("update_exclude_profile", {
      id,
      name,
      description,
    });
  },

  remove(id: number): Promise<ExcludeProfile[]> {
    return invokeCommand("delete_exclude_profile", { id });
  },

  addRule(profileId: number, pattern: string): Promise<ExcludeProfile[]> {
    return invokeCommand("add_exclude_rule", { profileId, pattern });
  },

  setRuleEnabled(
    ruleId: number,
    enabled: boolean,
  ): Promise<ExcludeProfile[]> {
    return invokeCommand("set_exclude_rule_enabled", { ruleId, enabled });
  },

  removeRule(ruleId: number): Promise<ExcludeProfile[]> {
    return invokeCommand("delete_exclude_rule", { ruleId });
  },

  excludeFile(
    sourceId: number,
    relativePath: string,
  ): Promise<ExcludeProfile[]> {
    return invokeCommand("exclude_backup_file", { sourceId, relativePath });
  },
};
