import { History, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { RunsList } from "@/components/RunsList";
import { profilesApi } from "@/features/profiles/api";
import { useTranslation } from "@/i18n";
import { useProfilesStore } from "@/stores/profiles";
import { useRuntimeStore } from "@/stores/runtime";
import type { BackupRun } from "@/types";
import { toAppError } from "@/types/errors";

export function HistoryPage() {
	const { t } = useTranslation();
	const { profiles, hasLoaded, load } = useProfilesStore();
	const runsVersion = useRuntimeStore((s) => s.runsVersion);
	const [runs, setRuns] = useState<BackupRun[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!hasLoaded) void load();
	}, [hasLoaded, load]);

	useEffect(() => {
		void runsVersion;
		let cancelled = false;
		profilesApi
			.listRuns(undefined, 200)
			.then((result) => {
				if (!cancelled) setRuns(result);
			})
			.catch((e) => {
				if (!cancelled) setError(toAppError(e).message);
			});
		return () => {
			cancelled = true;
		};
	}, [runsVersion]);

	const profileName = (profileId: number) =>
		profiles.find((p) => p.id === profileId)?.name;

	return (
		<div>
			<PageHeader
				title={t("history.title")}
				description={t("history.description")}
			/>
			{error ? (
				<p className="text-sm text-destructive">{error}</p>
			) : runs === null ? (
				<div className="flex justify-center py-16">
					<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			) : runs.length === 0 ? (
				<EmptyState
					icon={History}
					title={t("history.emptyTitle")}
					description={t("history.emptyDescription")}
				/>
			) : (
				<RunsList runs={runs} profileName={profileName} />
			)}
		</div>
	);
}
