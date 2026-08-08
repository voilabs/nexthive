import {
	AlertTriangle,
	CheckCircle2,
	HardDriveDownload,
	Loader2,
	RefreshCw,
	ShieldCheck,
	Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { settingsApi } from "@/features/settings/api";
import { useTranslation } from "@/i18n";
import { formatBytes, formatDateTime } from "@/lib/utils";
import type { DatabaseHealthReport, DatabaseRepairResult } from "@/types";
import { toAppError } from "@/types/errors";
import { SettingsPanel, SettingsRow } from "@/pages/SettingsPage";

function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border border-black/5 dark:border-white/5 bg-muted/45 px-3.5 py-3">
			<p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 text-sm font-semibold">{value}</p>
		</div>
	);
}

export function DatabaseMaintenanceCard() {
	const { t } = useTranslation();
	const [health, setHealth] = useState<DatabaseHealthReport | null>(null);
	const [result, setResult] = useState<DatabaseRepairResult | null>(null);
	const [loading, setLoading] = useState(true);
	const [repairing, setRepairing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refresh = async () => {
		setLoading(true);
		setError(null);
		try {
			setHealth(await settingsApi.databaseHealth());
		} catch (cause) {
			setError(toAppError(cause).message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void refresh();
	}, []);

	const repair = async () => {
		setRepairing(true);
		setError(null);
		setResult(null);
		try {
			const next = await settingsApi.repairDatabase();
			setResult(next);
			setHealth(next.after);
		} catch (cause) {
			setError(toAppError(cause).message);
		} finally {
			setRepairing(false);
		}
	};

	const status = health?.status;
	const StatusIcon =
		status === "healthy"
			? ShieldCheck
			: status === "corrupt"
				? AlertTriangle
				: Wrench;
	const statusLabel =
		status === "healthy"
			? t("settings.database.healthy")
			: status === "corrupt"
				? t("settings.database.damaged")
				: t("settings.database.needsRepair");
	const actionLabel =
		status === "corrupt" || health?.repairAvailable === false
			? t("settings.database.backupOnly")
			: status === "healthy"
				? t("settings.database.verify")
				: t("settings.database.repair");

	return (
		<SettingsPanel
			title={t("settings.database.title")}
			description={t("settings.database.description")}
		>
			<SettingsRow>
				<div className="flex flex-col space-y-4">
					<div className="flex items-start justify-between gap-4">
						{health ? (
							<Badge
								variant={status === "healthy" ? "success" : status === "corrupt" ? "destructive" : "warning"}
							>
								<StatusIcon />
								{statusLabel}
							</Badge>
						) : <div />}
					</div>
					{loading && !health ? (
						<div className="flex justify-center py-8">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					) : health ? (
						<div className="space-y-4">
							<div className="flex items-start gap-3 rounded-xl bg-muted/35 px-4 py-3 border border-black/5 dark:border-white/5">
								<StatusIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">{statusLabel}</p>
									<p className="mt-0.5 text-xs leading-5 text-muted-foreground">
										{health.status === "healthy"
											? t("settings.database.healthyDescription")
											: health.status === "corrupt"
												? t("settings.database.damagedDescription")
												: t("settings.database.repairDescription")}
									</p>
								</div>
							</div>

							<div className="grid grid-cols-4 gap-2.5">
								<Metric
									label={t("settings.database.schema")}
									value={`v${health.schemaVersion} / v${health.expectedSchemaVersion}`}
								/>
								<Metric
									label={t("settings.database.integrity")}
									value={health.integrityOk ? t("settings.database.ok") : t("settings.database.failed")}
								/>
								<Metric
									label={t("settings.database.relations")}
									value={health.foreignKeyViolations === 0 ? t("settings.database.ok") : String(health.foreignKeyViolations)}
								/>
								<Metric label={t("settings.database.size")} value={formatBytes(health.databaseSize)} />
							</div>

							{health.missingSchemaItems.length > 0 ? (
								<div className="rounded-xl border border-warning/25 bg-warning/[0.055] p-3.5">
									<p className="text-xs font-medium text-warning">{t("settings.database.missing")}</p>
									<div className="mt-2 flex flex-wrap gap-1.5">
										{health.missingSchemaItems.map((item) => (
											<code key={item} className="rounded bg-background/70 px-1.5 py-0.5 text-[10px]">{item}</code>
										))}
									</div>
								</div>
							) : null}

							{result ? (
								<div className="rounded-xl border border-success/25 bg-success/[0.055] p-3.5">
									<p className="flex items-center gap-2 text-xs font-semibold text-success">
										<CheckCircle2 className="h-3.5 w-3.5" />
										{t("settings.database.completed")}
									</p>
									<p className="mt-2 text-xs text-muted-foreground">{t("settings.database.backupCreated")}</p>
									<p className="mt-1 select-text break-all font-mono text-[10px] text-muted-foreground">{result.backupPath}</p>
									<ul className="mt-2 space-y-1 text-xs text-muted-foreground">
										{result.repairsApplied.map((repair) => <li key={repair}>· {repair}</li>)}
									</ul>
								</div>
							) : null}

							{error ? <p className="text-sm text-destructive">{error}</p> : null}
							<Separator />
							<div className="flex items-center justify-between gap-4">
								<p className="text-[11px] text-muted-foreground">
									{t("settings.database.lastChecked", { date: formatDateTime(health.checkedAt) })}
								</p>
								<div className="flex gap-2">
									<Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={loading || repairing}>
										{loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
										{t("settings.database.refresh")}
									</Button>
									<Button size="sm" onClick={() => void repair()} disabled={repairing || loading}>
										{repairing ? <Loader2 className="animate-spin" /> : health.repairAvailable ? <Wrench /> : <HardDriveDownload />}
										{repairing ? t("settings.database.working") : actionLabel}
									</Button>
								</div>
							</div>
						</div>
					) : error ? (
						<div className="space-y-3 py-2">
							<p className="text-sm text-destructive">{error}</p>
							<Button variant="outline" size="sm" onClick={() => void refresh()}>{t("settings.database.refresh")}</Button>
						</div>
					) : null}
				</div>
			</SettingsRow>
		</SettingsPanel>
	);
}
