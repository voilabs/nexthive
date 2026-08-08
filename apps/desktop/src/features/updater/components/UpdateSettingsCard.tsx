import {
	AlertCircle,
	CheckCircle2,
	Download,
	Loader2,
	RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { useUpdaterStore } from "@/stores/updater";
import { SettingsPanel, SettingsRow } from "@/pages/SettingsPage";

export function UpdateSettingsCard({
	currentVersion,
}: {
	currentVersion?: string;
}) {
	const { t } = useTranslation();
	const status = useUpdaterStore((state) => state.status);
	const update = useUpdaterStore((state) => state.update);
	const downloadedBytes = useUpdaterStore((state) => state.downloadedBytes);
	const totalBytes = useUpdaterStore((state) => state.totalBytes);
	const lastCheckedAt = useUpdaterStore((state) => state.lastCheckedAt);
	const error = useUpdaterStore((state) => state.error);
	const check = useUpdaterStore((state) => state.check);
	const install = useUpdaterStore((state) => state.install);

	const checking = status === "checking";
	const downloading = status === "downloading";
	const installing = status === "installing";
	const progress = totalBytes
		? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
		: null;

	return (
		<SettingsPanel
			title={t("updates.title")}
			description={t("updates.description")}
		>
			<SettingsRow>
				<div className="flex items-start gap-4">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/80 ring-1 ring-inset ring-border/50">
						{checking || downloading || installing ? (
							<Loader2 className="h-4 w-4 animate-spin text-brand" />
						) : status === "available" ? (
							<Download className="h-4 w-4 text-brand" />
						) : status === "error" ? (
							<AlertCircle className="h-4 w-4 text-destructive" />
						) : (
							<CheckCircle2 className="h-4 w-4 text-success" />
						)}
					</div>

					<div className="min-w-0 flex-1">
						<p className="text-sm font-medium">
							{checking
								? t("updates.checking")
								: status === "available" && update
									? t("updates.ready", { version: update.version })
									: downloading && update
										? t("updates.downloading", { version: update.version })
										: installing
											? t("updates.installing")
											: status === "error"
												? t("updates.failed")
												: status === "upToDate"
													? t("updates.upToDate")
													: t("updates.current", {
															version: currentVersion ?? "—",
														})}
						</p>
						<p className="mt-1 text-xs leading-5 text-muted-foreground">
							{error?.message ??
								(installing
									? t("updates.restart")
									: downloading
										? totalBytes
											? t("updates.downloadedOf", {
													downloaded: formatBytes(downloadedBytes),
													total: formatBytes(totalBytes),
												})
											: t("updates.downloaded", {
													downloaded: formatBytes(downloadedBytes),
												})
										: lastCheckedAt
											? t("updates.lastChecked", {
													date: formatDateTime(lastCheckedAt),
												})
											: t("updates.quietly"))}
						</p>

						{downloading && progress !== null ? (
							<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full bg-brand transition-[width] duration-200"
									style={{ width: `${progress}%` }}
								/>
							</div>
						) : null}

						{status === "available" && update?.notes ? (
							<p className="select-text mt-3 max-h-24 overflow-y-auto whitespace-pre-line rounded-xl bg-muted/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
								{update.notes}
							</p>
						) : null}
					</div>

					<div className="shrink-0">
						{status === "available" ? (
							<Button onClick={() => void install()}>
								<Download />
								{t("updates.updateNow")}
							</Button>
						) : (
							<Button
								variant="outline"
								disabled={checking || downloading || installing}
								onClick={() => void check()}
							>
								<RefreshCw className={checking ? "animate-spin" : undefined} />
								{status === "error"
									? t("updates.tryAgain")
									: t("updates.checkNow")}
							</Button>
						)}
					</div>
				</div>
			</SettingsRow>
		</SettingsPanel>
	);
}

