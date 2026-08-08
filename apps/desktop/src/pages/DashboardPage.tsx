import type { LucideIcon } from "lucide-react";
import {
	Archive,
	ArrowRight,
	CalendarClock,
	CheckCircle2,
	CircleDashed,
	FolderOpen,
	GitCommitHorizontal,
	Loader2,
	Plus,
	Server,
	UploadCloud,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { profilesApi } from "@/features/profiles/api";
import { useTranslation } from "@/i18n";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { useIntegrationsStore } from "@/stores/integrations";
import { useProfilesStore } from "@/stores/profiles";
import { stageLabel, useRuntimeStore } from "@/stores/runtime";
import type { BackupRun } from "@/types";
import { toAppError } from "@/types/errors";

function Stat({
	icon: Icon,
	label,
	value,
}: {
	icon: LucideIcon;
	label: string;
	value: string | number;
}) {
	return (
		<div className="flex flex-col justify-center px-6 py-5">
			<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80">
				<Icon className="h-4 w-4 text-muted-foreground/60" />
				{label}
			</div>
			<div className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-foreground/90">
				{value}
			</div>
		</div>
	);
}

function runIcon(run: BackupRun) {
	if (run.status === "success")
		return <CheckCircle2 className="h-4 w-4 text-success" />;
	if (run.status === "running") {
		return (
			<CircleDashed className="h-4 w-4 animate-spin text-muted-foreground" />
		);
	}
	return <XCircle className="h-4 w-4 text-destructive" />;
}

export function DashboardPage() {
	const { t } = useTranslation();
	const { profiles, sourcesByProfile, hasLoaded, load } = useProfilesStore();
	const accounts = useIntegrationsStore((state) => state.accounts);
	const integrationsLoaded = useIntegrationsStore((state) => state.hasLoaded);
	const loadIntegrations = useIntegrationsStore((state) => state.load);
	const stages = useRuntimeStore((state) => state.stages);
	const runsVersion = useRuntimeStore((state) => state.runsVersion);

	const [recentRuns, setRecentRuns] = useState<BackupRun[]>([]);
	const [backingUp, setBackingUp] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!hasLoaded) void load();
	}, [hasLoaded, load]);

	useEffect(() => {
		if (!integrationsLoaded) void loadIntegrations();
	}, [integrationsLoaded, loadIntegrations]);

	useEffect(() => {
		void runsVersion;
		let cancelled = false;
		profilesApi
			.listRuns(undefined, 8)
			.then((runs) => {
				if (!cancelled) setRecentRuns(runs);
			})
			.catch(() => { });
		return () => {
			cancelled = true;
		};
	}, [runsVersion]);

	const enabledProfiles = profiles.filter((profile) => profile.enabled);
	const sourceFolderCount = profiles.reduce(
		(count, profile) => count + (sourcesByProfile[profile.id]?.length ?? 0),
		0,
	);
	const eligibleProfiles = enabledProfiles.filter(
		(profile) =>
			profile.integrationAccountId !== null &&
			profile.repositoryName !== null &&
			(sourcesByProfile[profile.id]?.length ?? 0) > 0,
	);
	const runningProfile = profiles.find((profile) => stages[profile.id]);
	const lastSuccessfulRun = recentRuns.find((run) => run.status === "success");

	const profileName = (profileId: number) =>
		profiles.find((profile) => profile.id === profileId)?.name ??
		t("dashboard.profileFallback", { id: profileId });
	const runStatus = (status: BackupRun["status"]) =>
		t(
			`common.${status}` as
			| "common.success"
			| "common.running"
			| "common.failed"
			| "common.cancelled",
		);

	const handleBackupAll = async () => {
		setError(null);
		setBackingUp(true);
		const failures: string[] = [];
		for (const profile of eligibleProfiles) {
			try {
				await profilesApi.runBackup(profile.id);
			} catch (cause) {
				failures.push(`${profile.name}: ${toAppError(cause).message}`);
			}
		}
		setBackingUp(false);
		if (failures.length > 0) setError(failures.join(" · "));
	};

	const backupAction =
		eligibleProfiles.length > 0 ? (
			<Button
				onClick={() => void handleBackupAll()}
				disabled={backingUp || Boolean(runningProfile)}
			>
				{backingUp || runningProfile ? (
					<Loader2 className="animate-spin" />
				) : (
					<UploadCloud />
				)}
				{backingUp || runningProfile
					? t("dashboard.backingUp")
					: t("dashboard.backUpNow")}
			</Button>
		) : (
			<Button asChild>
				<Link to="/backups">
					<Plus />
					{profiles.length > 0
						? t("dashboard.finishSetup")
						: t("dashboard.newProfile")}
				</Link>
			</Button>
		);

	return (
		<div className="pb-12">
			<PageHeader
				title={t("dashboard.title")}
				description={t("dashboard.description")}
				actions={
					<>
						<Button variant="outline" asChild>
							<Link to="/backups">
								<Archive />
								{t("dashboard.manageProfiles")}
							</Link>
						</Button>
						{backupAction}
					</>
				}
			/>

			{error ? (
				<p className="mb-4 rounded-2xl bg-destructive/8 px-4 py-3 text-sm text-destructive">
					{error}
				</p>
			) : null}

			<Card>
				<CardContent className="grid grid-cols-4 divide-x divide-border/50 p-0">
					<Stat
						icon={Archive}
						label={t("dashboard.backupProfiles")}
						value={formatNumber(profiles.length)}
					/>
					<Stat
						icon={FolderOpen}
						label={t("dashboard.sourceFolders")}
						value={formatNumber(sourceFolderCount)}
					/>
					<Stat
						icon={CalendarClock}
						label={t("dashboard.lastSuccessfulRun")}
						value={
							lastSuccessfulRun
								? formatDateTime(lastSuccessfulRun.startedAt)
								: t("common.notYet")
						}
					/>
					<Stat
						icon={Server}
						label={t("dashboard.connectedAccounts")}
						value={formatNumber(accounts.length)}
					/>
				</CardContent>
			</Card>

			<div className="mt-8 grid grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)] items-start gap-6">
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between px-1">
						<h3 className="text-base font-semibold tracking-tight text-foreground/90">
							{t("dashboard.backupProfiles")}
						</h3>
						<Link
							to="/backups"
							className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
						>
							{t("common.viewAll")} <ArrowRight className="h-3 w-3" />
						</Link>
					</div>
					<Card className="overflow-hidden">
						<CardContent className="p-0">
							{profiles.length === 0 ? (
								<div className="px-5 py-10 text-center">
									<p className="text-sm font-medium">
										{t("dashboard.noProfiles")}
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{t("dashboard.noProfilesDescription")}
									</p>
								</div>
							) : (
								<div className="divide-y divide-border/50">
									{profiles.slice(0, 5).map((profile) => {
										const folderCount = sourcesByProfile[profile.id]?.length ?? 0;
										const repository =
											profile.repositoryOwner && profile.repositoryName
												? `${profile.repositoryOwner}/${profile.repositoryName}`
												: t("dashboard.destinationMissing");
										return (
											<Link
												key={profile.id}
												to={`/backups/${profile.id}`}
												className="group flex justify-between items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/40"
											>
												<span className="min-w-0">
													<span className="block truncate text-[14px] font-medium text-foreground/90 transition-colors group-hover:text-primary">
														{profile.name}
													</span>
													<span className="mt-0.5 block truncate text-[12px] text-muted-foreground/80">
														{repository}
													</span>
												</span>
												<div className="flex items-center gap-4">
													<span className="flex items-center gap-1.5 text-[12px] text-muted-foreground/80">
														<FolderOpen className="h-3.5 w-3.5 text-muted-foreground/60" />
														{formatNumber(folderCount)}{" "}
														{folderCount === 1
															? t("dashboard.folder")
															: t("dashboard.folders")}
													</span>
													<Badge
														variant={profile.enabled ? "success" : "warning"}
														className="h-5 w-fit justify-center rounded-md px-1.5 text-[10px] font-medium uppercase tracking-wider"
													>
														{profile.enabled
															? t("common.active")
															: t("common.paused")}
													</Badge>
													<ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
												</div>
											</Link>
										);
									})}
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				<div className="flex flex-col gap-3">
					<div className="px-1">
						<h3 className="text-base font-semibold tracking-tight text-foreground/90">
							{t("dashboard.currentActivity")}
						</h3>
					</div>
					<Card>
						<CardContent className="p-5">
							{runningProfile ? (
								<div>
									<div className="flex items-center gap-2 text-[14px] font-medium text-foreground/90">
										<Loader2 className="h-4 w-4 animate-spin text-primary" />
										{runningProfile.name}
									</div>
									<p className="mt-2 text-[13px] leading-relaxed text-muted-foreground/90">
										{stageLabel(
											stages[runningProfile.id].stage,
											stages[runningProfile.id].filesScanned,
										)}
									</p>
								</div>
							) : recentRuns[0] ? (
								<div>
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-2 text-[14px] font-medium text-foreground/90">
											{runIcon(recentRuns[0])}
											{profileName(recentRuns[0].profileId)}
										</div>
										<Badge
											variant={
												recentRuns[0].status === "success"
													? "success"
													: "destructive"
											}
											className="h-5 justify-center rounded-md px-1.5 text-[10px] font-medium uppercase tracking-wider"
										>
											{runStatus(recentRuns[0].status)}
										</Badge>
									</div>
									<p className="mt-2 text-[12px] text-muted-foreground/80">
										{formatDateTime(recentRuns[0].startedAt)}
									</p>
									<div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
										<span className="text-[12px] text-muted-foreground/80">
											{t("dashboard.filesChanged", {
												count: formatNumber(
													recentRuns[0].filesAdded +
													recentRuns[0].filesModified +
													recentRuns[0].filesDeleted,
												),
											})}
										</span>
										{recentRuns[0].commitSha ? (
											<span className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 font-mono text-[10px] text-muted-foreground">
												<GitCommitHorizontal className="h-3 w-3" />
												{recentRuns[0].commitSha.slice(0, 7)}
											</span>
										) : null}
									</div>
								</div>
							) : (
								<div className="py-6 text-center">
									<CircleDashed className="mx-auto h-6 w-6 text-muted-foreground/40" />
									<p className="mt-3 text-[14px] font-medium text-foreground/90">
										{t("dashboard.noActivity")}
									</p>
									<p className="mt-1.5 text-[12px] text-muted-foreground/70">
										{t("dashboard.noActivityDescription")}
									</p>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			{recentRuns.length > 0 ? (
				<section className="mt-6 flex flex-col gap-2">
					<div className="flex items-center justify-between px-1">
						<h3 className="text-base font-semibold tracking-tight text-foreground/90">
							{t("dashboard.recentRuns")}
						</h3>
						<Link
							to="/history"
							className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
						>
							{t("dashboard.openHistory")} <ArrowRight className="h-3 w-3" />
						</Link>
					</div>
					<Card className="overflow-hidden">
						<div className="divide-y divide-border/50">
							{recentRuns.slice(0, 4).map((run) => {
								const changed =
									run.filesAdded + run.filesModified + run.filesDeleted;
								return (
									<div
										key={run.id}
										className="grid grid-cols-[20px_minmax(0,1fr)_150px_95px] items-center gap-4 px-5 py-3.5"
									>
										{runIcon(run)}
										<span className="truncate text-[14px] font-medium text-foreground/90">
											{profileName(run.profileId)}
										</span>
										<span className="text-[12px] text-muted-foreground/80">
											{formatDateTime(run.startedAt)}
										</span>
										<span className="text-right text-[12px] text-muted-foreground/80">
											{t("dashboard.changed", {
												count: formatNumber(changed),
											})}
										</span>
									</div>
								);
							})}
						</div>
					</Card>
				</section>
			) : null}
		</div>
	);
}
