import {
	CheckCircle2,
	CircleDashed,
	GitCommitHorizontal,
	XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { translate, useTranslation } from "@/i18n";
import { formatBytes, formatDateTime, formatNumber } from "@/lib/utils";
import { SettingsRow } from "@/pages/SettingsPage";
import type { BackupRun } from "@/types";

function runDuration(run: BackupRun): string | null {
	if (!run.completedAt) return null;
	const seconds = Math.max(
		0,
		Math.round(
			(new Date(run.completedAt).getTime() -
				new Date(run.startedAt).getTime()) /
				1000,
		),
	);
	if (seconds < 60) {
		return translate("duration.seconds", { count: formatNumber(seconds) });
	}
	return translate("duration.minutes", {
		minutes: formatNumber(Math.floor(seconds / 60)),
		seconds: formatNumber(seconds % 60),
	});
}

interface RunsListProps {
	runs: BackupRun[];
	/** Resolves a profile name for display; omit on single-profile lists. */
	profileName?: (profileId: number) => string | undefined;
}

export function RunsList({ runs, profileName }: RunsListProps) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col gap-1 pb-12">
			{runs.map((run) => {
				const changed = run.filesAdded + run.filesModified + run.filesDeleted;
				const duration = runDuration(run);
				return (
					<SettingsRow key={run.id}>
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2.5">
								{run.status === "success" ? (
									<CheckCircle2 className="h-4.5 w-4.5 text-success" />
								) : run.status === "running" ? (
									<CircleDashed className="h-4.5 w-4.5 animate-spin text-muted-foreground" />
								) : (
									<XCircle className="h-4.5 w-4.5 text-destructive" />
								)}
								<span className="text-sm font-medium">
									{formatDateTime(run.startedAt)}
								</span>
								{profileName?.(run.profileId) ? (
									<Badge variant="secondary">
										{profileName(run.profileId)}
									</Badge>
								) : null}
							</div>
							<div className="flex items-center gap-3 text-xs text-muted-foreground">
								{duration ? <span>{duration}</span> : null}
								{run.commitSha ? (
									<span className="inline-flex items-center gap-1 font-mono">
										<GitCommitHorizontal className="h-3.5 w-3.5" />
										{run.commitSha.slice(0, 7)}
									</span>
								) : null}
							</div>
						</div>
						<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-7 text-sm text-muted-foreground">
							{run.status === "failed" ? (
								<span className="text-destructive">
									{run.errorMessage ?? t("common.failed")}
								</span>
							) : changed === 0 && run.status === "success" ? (
								<span>{t("common.noChanges")}</span>
							) : (
								<>
									<span>
										{t("dashboard.filesChanged", {
											count: formatNumber(changed),
										})}
									</span>
									<span className="text-success">
										+{formatNumber(run.filesAdded)}
									</span>
									<span className="text-warning">
										~{formatNumber(run.filesModified)}
									</span>
									<span className="text-destructive">
										−{formatNumber(run.filesDeleted)}
									</span>
									{run.bytesProcessed > 0 ? (
										<span>{formatBytes(run.bytesProcessed)}</span>
									) : null}
								</>
							)}
						</div>
					</SettingsRow>
				);
			})}
		</div>
	);
}
