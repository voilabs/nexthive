import { create } from "zustand";

import { automaticProfilesApi } from "@/features/automaticProfiles/api";
import { useProfilesStore } from "@/stores/profiles";
import type {
	AppError,
	AutomaticProfileRule,
	AutomaticProfileSyncResult,
	SaveAutomaticProfileRuleInput,
} from "@/types";
import { toAppError } from "@/types/errors";

interface AutomaticProfilesState {
	rules: AutomaticProfileRule[];
	isLoading: boolean;
	hasLoaded: boolean;
	syncingIds: number[];
	error: AppError | null;
	load(): Promise<void>;
	create(input: SaveAutomaticProfileRuleInput): Promise<AutomaticProfileSyncResult>;
	update(
		id: number,
		input: SaveAutomaticProfileRuleInput,
	): Promise<AutomaticProfileRule>;
	sync(id: number): Promise<AutomaticProfileSyncResult>;
	remove(id: number): Promise<void>;
	upsert(rule: AutomaticProfileRule): void;
}

function replaceRule(
	rules: AutomaticProfileRule[],
	rule: AutomaticProfileRule,
): AutomaticProfileRule[] {
	const exists = rules.some((candidate) => candidate.id === rule.id);
	return exists
		? rules.map((candidate) => (candidate.id === rule.id ? rule : candidate))
		: [...rules, rule];
}

export const useAutomaticProfilesStore = create<AutomaticProfilesState>(
	(set) => ({
		rules: [],
		isLoading: false,
		hasLoaded: false,
		syncingIds: [],
		error: null,

		async load() {
			set({ isLoading: true, error: null });
			try {
				const rules = await automaticProfilesApi.list();
				set({ rules, isLoading: false, hasLoaded: true });
			} catch (error) {
				set({ error: toAppError(error), isLoading: false, hasLoaded: true });
			}
		},

		async create(input) {
			const result = await automaticProfilesApi.create(input);
			set((state) => ({ rules: replaceRule(state.rules, result.rule) }));
			await useProfilesStore.getState().load();
			return result;
		},

		async update(id, input) {
			const rule = await automaticProfilesApi.update(id, input);
			set((state) => ({ rules: replaceRule(state.rules, rule) }));
			await useProfilesStore.getState().load();
			return rule;
		},

		async sync(id) {
			set((state) => ({
				syncingIds: state.syncingIds.includes(id)
					? state.syncingIds
					: [...state.syncingIds, id],
				error: null,
			}));
			try {
				const result = await automaticProfilesApi.sync(id);
				set((state) => ({
					rules: replaceRule(state.rules, result.rule),
					syncingIds: state.syncingIds.filter((candidate) => candidate !== id),
				}));
				await useProfilesStore.getState().load();
				return result;
			} catch (error) {
				set((state) => ({
					syncingIds: state.syncingIds.filter((candidate) => candidate !== id),
					error: toAppError(error),
				}));
				throw error;
			}
		},

		async remove(id) {
			await automaticProfilesApi.remove(id);
			set((state) => ({
				rules: state.rules.filter((rule) => rule.id !== id),
			}));
			await useProfilesStore.getState().load();
		},

		upsert(rule) {
			set((state) => ({ rules: replaceRule(state.rules, rule) }));
		},
	}),
);
