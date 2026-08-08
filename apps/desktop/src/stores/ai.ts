import { create } from "zustand";
import { aiApi } from "@/features/integrations/aiApi";
import type {
	AiConnectionTestResult,
	AiProviderAccount,
	AppError,
	CreateAiProviderAccountInput,
} from "@/types";
import { toAppError } from "@/types/errors";

interface AiState {
	accounts: AiProviderAccount[];
	isLoading: boolean;
	hasLoaded: boolean;
	error: AppError | null;
	load(): Promise<void>;
	add(input: CreateAiProviderAccountInput): Promise<AiProviderAccount>;
	test(id: number): Promise<AiConnectionTestResult>;
	remove(id: number): Promise<void>;
}

export const useAiStore = create<AiState>((set) => ({
	accounts: [],
	isLoading: false,
	hasLoaded: false,
	error: null,

	async load() {
		set({ isLoading: true, error: null });
		try {
			const accounts = await aiApi.listAccounts();
			set({ accounts, isLoading: false, hasLoaded: true });
		} catch (error) {
			set({ error: toAppError(error), isLoading: false, hasLoaded: true });
		}
	},

	async add(input) {
		const account = await aiApi.addAccount(input);
		set((state) => ({ accounts: [...state.accounts, account] }));
		return account;
	},

	test(id) {
		return aiApi.testConnection(id);
	},

	async remove(id) {
		await aiApi.removeAccount(id);
		set((state) => ({
			accounts: state.accounts.filter((account) => account.id !== id),
		}));
	},
}));
