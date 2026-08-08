import { Activity, CheckCircle2, CircleDashed, XCircle } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTranslation } from "@/i18n";
import { formatDateTime } from "@/lib/utils";
import { SettingsRow } from "@/pages/SettingsPage";
import { useProfilesStore } from "@/stores/profiles";
import { useRuntimeStore } from "@/stores/runtime";

export function ActivityPage() {
	const { t } = useTranslation();
	const feed = useRuntimeStore((s) => s.feed);
	const profiles = useProfilesStore((s) => s.profiles);

	const profileName = (profileId: number) =>
		profiles.find((p) => p.id === profileId)?.name ??
		t("dashboard.profileFallback", { id: profileId });

	return (
		<div>
			<PageHeader
				title={t("activity.title")}
				description={t("activity.description")}
			/>
			{feed.length === 0 ? (
				<EmptyState
					icon={Activity}
					title={t("activity.emptyTitle")}
					description={t("activity.emptyDescription")}
				/>
			) : (
				<div className="flex flex-col gap-1 pb-12">
					{feed.map((entry) => (
						<SettingsRow key={entry.id}>
							<div className="flex items-center gap-3 text-sm">
								{entry.kind === "completed" ? (
									<CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
								) : entry.kind === "failed" ? (
									<XCircle className="h-4 w-4 shrink-0 text-destructive" />
								) : (
									<CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground" />
								)}
								<span className="w-40 shrink-0 truncate font-medium">
									{profileName(entry.profileId)}
								</span>
								<span className="min-w-0 flex-1 truncate text-muted-foreground">
									{entry.text}
								</span>
								<span className="shrink-0 text-xs text-muted-foreground">
									{formatDateTime(entry.time)}
								</span>
							</div>
						</SettingsRow>
					))}
				</div>
			)}
		</div>
	);
}
