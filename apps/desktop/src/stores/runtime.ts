import { create } from "zustand";

import { type TranslationKey, translate } from "@/i18n";
import { formatNumber } from "@/lib/utils";
import type { BackupFileIssue, BackupStage } from "@/types";

export interface ActivityEntry {
	id: number;
	time: string;
	profileId: number;
	kind: "progress" | "completed" | "failed";
	text: string;
}

interface RuntimeState {
	/** Live stage per profile while a backup is running. */
	stages: Record<number, { stage: BackupStage; filesScanned: number | null }>;
	/** Session-local activity feed, newest first. */
	feed: ActivityEntry[];
	/** Bumped when a run finishes so run lists refetch. */
	runsVersion: number;
	problems: Record<
		number,
		{ message: string; fileIssue: BackupFileIssue | null }
	>;

	setStage(
		profileId: number,
		stage: BackupStage,
		filesScanned: number | null,
	): void;
	finishBackup(
		profileId: number,
		kind: "completed" | "failed",
		text: string,
		fileIssue?: BackupFileIssue,
	): void;
	clearProblem(profileId: number): void;
}

let nextEntryId = 1;

const STAGE_TEXT: Record<BackupStage, TranslationKey> = {
	scanning: "backup.stage.scanning",
	comparing: "backup.stage.comparing",
	syncing: "backup.stage.syncing",
	committing: "backup.stage.committing",
	pushing: "backup.stage.pushing",
	uploadingLargeFiles: "backup.stage.uploadingLargeFiles",
};

export function stageLabel(
	stage: BackupStage,
	filesScanned?: number | null,
): string {
	const base = translate(STAGE_TEXT[stage]);
	if (stage === "scanning" && filesScanned) {
		return `${base} (${formatNumber(filesScanned)})`;
	}
	return `${base}...`;
}

export const useRuntimeStore = create<RuntimeState>((set) => ({
	stages: {},
	feed: [],
	runsVersion: 0,
	problems: {},

	setStage(profileId, stage, filesScanned) {
		set((state) => {
			const previous = state.stages[profileId];
			const feed =
				previous?.stage === stage
					? state.feed // scanning count updates don't spam the feed
					: [
							{
								id: nextEntryId++,
								time: new Date().toISOString(),
								profileId,
								kind: "progress" as const,
								text: stageLabel(stage),
							},
							...state.feed,
						].slice(0, 200);
			return {
				stages: { ...state.stages, [profileId]: { stage, filesScanned } },
				feed,
			};
		});
	},

	finishBackup(profileId, kind, text, fileIssue) {
		set((state) => {
			const { [profileId]: _done, ...stages } = state.stages;
			const { [profileId]: _oldProblem, ...otherProblems } = state.problems;
			return {
				stages,
				problems:
					kind === "failed"
						? {
								...otherProblems,
								[profileId]: { message: text, fileIssue: fileIssue ?? null },
							}
						: otherProblems,
				runsVersion: state.runsVersion + 1,
				feed: [
					{
						id: nextEntryId++,
						time: new Date().toISOString(),
						profileId,
						kind,
						text,
					},
					...state.feed,
				].slice(0, 200),
			};
		});
	},

	clearProblem(profileId) {
		set((state) => {
			const { [profileId]: _removed, ...problems } = state.problems;
			return { problems };
		});
	},
}));
