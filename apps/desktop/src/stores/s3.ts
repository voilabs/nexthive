import { create } from "zustand";
import { s3Api } from "@/features/s3/api";
import type { CreateS3AccountInput, S3Account } from "@/types";

interface S3State {
  accounts: S3Account[];
  loaded: boolean;
  load(): Promise<void>;
  add(input: CreateS3AccountInput): Promise<void>;
  remove(id: number): Promise<void>;
}

export const useS3Store = create<S3State>((set) => ({
  accounts: [], loaded: false,
  async load() { set({ accounts: await s3Api.list(), loaded: true }); },
  async add(input) { const account = await s3Api.add(input); set((s) => ({ accounts: [...s.accounts, account] })); },
  async remove(id) { await s3Api.remove(id); set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })); },
}));
