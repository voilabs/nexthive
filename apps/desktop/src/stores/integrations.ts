import { create } from "zustand";

import { integrationsApi } from "@/features/integrations/api";
import { useProfilesStore } from "@/stores/profiles";
import { toAppError } from "@/types/errors";
import type {
  AddTokenAccountResult,
  AppError,
  ConnectionTestResult,
  GitProvider,
  IntegrationAccount,
} from "@/types";

interface IntegrationsState {
  accounts: IntegrationAccount[];
  isLoading: boolean;
  hasLoaded: boolean;
  error: AppError | null;

  load(): Promise<void>;
  addTokenAccount(
    provider: GitProvider,
    label: string,
    baseUrl: string | null,
    token: string,
  ): Promise<AddTokenAccountResult>;
  addSshAccount(
    provider: GitProvider,
    label: string,
  ): Promise<IntegrationAccount>;
  testConnection(id: number): Promise<ConnectionTestResult>;
  removeAccount(id: number): Promise<void>;
}

export const useIntegrationsStore = create<IntegrationsState>((set) => ({
  accounts: [],
  isLoading: false,
  hasLoaded: false,
  error: null,

  async load() {
    set({ isLoading: true, error: null });
    try {
      const accounts = await integrationsApi.listAccounts();
      set({ accounts, isLoading: false, hasLoaded: true });
    } catch (error) {
      set({ error: toAppError(error), isLoading: false, hasLoaded: true });
    }
  },

  async addTokenAccount(provider, label, baseUrl, token) {
    const result = await integrationsApi.addTokenAccount(
      provider,
      label,
      baseUrl,
      token,
    );
    set((state) => ({ accounts: [...state.accounts, result.account] }));
    return result;
  },

  async addSshAccount(provider, label) {
    const account = await integrationsApi.addSshAccount(provider, label);
    set((state) => ({ accounts: [...state.accounts, account] }));
    return account;
  },

  async testConnection(id) {
    const result = await integrationsApi.testConnection(id);
    if (result.success) {
      set({ accounts: await integrationsApi.listAccounts() });
    }
    return result;
  },

  async removeAccount(id) {
    await integrationsApi.removeAccount(id);
    set((state) => ({
      accounts: state.accounts.filter((account) => account.id !== id),
    }));
    // SQLite unlinks profiles through ON DELETE SET NULL. Refresh the profile
    // store so backup actions cannot keep using a stale account id in memory.
    await useProfilesStore.getState().load();
  },
}));
