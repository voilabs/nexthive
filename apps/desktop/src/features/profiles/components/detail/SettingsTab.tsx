import {
	BrainCircuit,
	Check,
	ExternalLink,
	Layers3,
	Loader2,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { getAiProvider } from "@/features/integrations/aiProviders";
import { profilesApi } from "@/features/profiles/api";
import { useTranslation } from "@/i18n";
import { useAiStore } from "@/stores/ai";
import { useProfilesStore } from "@/stores/profiles";
import type { BackupProfile, BackupSettings } from "@/types";
import { toAppError } from "@/types/errors";

function SettingRow({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-6 py-3">
			<div>
				<div className="text-sm font-medium">{title}</div>
				<div className="mt-0.5 text-sm text-muted-foreground">
					{description}
				</div>
			</div>
			<div className="shrink-0">{children}</div>
		</div>
	);
}

export function SettingsTab({ profile }: { profile: BackupProfile }) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const updateProfile = useProfilesStore((s) => s.update);
	const removeProfile = useProfilesStore((s) => s.remove);
	const aiAccounts = useAiStore((state) => state.accounts);
	const aiAccountsLoaded = useAiStore((state) => state.hasLoaded);
	const loadAiAccounts = useAiStore((state) => state.load);

	const [settings, setSettings] = useState<BackupSettings | null>(null);
	const [nameDraft, setNameDraft] = useState(profile.name);
	const [savingName, setSavingName] = useState(false);
	const [dailyEnabled, setDailyEnabled] = useState(false);
	const [timeDraft, setTimeDraft] = useState("02:00");
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		profilesApi
			.getSettings(profile.id)
			.then((result) => {
				if (cancelled) return;
				setSettings(result);
				setDailyEnabled(result.backupTime !== null);
				if (result.backupTime) setTimeDraft(result.backupTime);
			})
			.catch((e) => {
				if (!cancelled) setError(toAppError(e).message);
			});
		return () => {
			cancelled = true;
		};
	}, [profile.id]);

	useEffect(() => {
		if (!aiAccountsLoaded) void loadAiAccounts();
	}, [aiAccountsLoaded, loadAiAccounts]);

	const applySettings = async (
		input: Parameters<typeof profilesApi.updateSettings>[1],
	) => {
		setError(null);
		try {
			const updated = await profilesApi.updateSettings(profile.id, input);
			setSettings(updated);
			setDailyEnabled(updated.backupTime !== null);
			if (updated.backupTime) setTimeDraft(updated.backupTime);
		} catch (e) {
			setError(toAppError(e).message);
		}
	};

	const handleSaveName = async () => {
		if (nameDraft.trim() === profile.name || !nameDraft.trim()) return;
		setSavingName(true);
		setError(null);
		try {
			await updateProfile(profile.id, { name: nameDraft.trim() });
		} catch (e) {
			setError(toAppError(e).message);
		} finally {
			setSavingName(false);
		}
	};

	const handleDailyToggle = (enabled: boolean) => {
		setDailyEnabled(enabled);
		void applySettings({ backupTime: enabled ? timeDraft : null });
	};

	const handleTimeChange = (value: string) => {
		setTimeDraft(value);
		if (dailyEnabled && value) {
			void applySettings({ backupTime: value });
		}
	};

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await removeProfile(profile.id);
			navigate("/backups");
		} catch (e) {
			setError(toAppError(e).message);
			setDeleting(false);
			setConfirmDelete(false);
		}
	};

	return (
		<div className="max-w-xl">
			<div className="grid max-w-sm gap-2">
				<Label htmlFor="profile-name-edit">{t("profileSettings.name")}</Label>
				<div className="flex gap-2">
					<Input
						id="profile-name-edit"
						value={nameDraft}
						onChange={(e) => setNameDraft(e.target.value)}
					/>
					<Button
						variant="outline"
						onClick={handleSaveName}
						disabled={savingName || nameDraft.trim() === profile.name}
					>
						{savingName ? <Loader2 className="animate-spin" /> : <Check />}
						{t("common.save")}
					</Button>
				</div>
			</div>

			<Separator className="my-5" />

			<h3 className="mb-1 text-sm font-semibold">{t("profileSettings.schedule")}</h3>
			{settings === null ? (
				<p className="py-3 text-sm text-muted-foreground">{t("common.loading")}</p>
			) : (
				<div className="divide-y">
					<SettingRow
						title={t("profileSettings.daily.title")}
						description={t("profileSettings.daily.description")}
					>
						<div className="flex items-center gap-3">
							{dailyEnabled ? (
								<Input
									type="time"
									className="w-28"
									value={timeDraft}
									onChange={(e) => handleTimeChange(e.target.value)}
								/>
							) : null}
							<Switch
								checked={dailyEnabled}
								onCheckedChange={handleDailyToggle}
								aria-label={t("profileSettings.daily.toggle")}
							/>
						</div>
					</SettingRow>
					<SettingRow
						title={t("profileSettings.startup.title")}
						description={t("profileSettings.startup.description")}
					>
						<Switch
							checked={settings.backupOnStartup}
							onCheckedChange={(checked) =>
								void applySettings({ backupOnStartup: checked })
							}
							aria-label={t("profileSettings.startup.toggle")}
						/>
					</SettingRow>
					<div className="py-3">
						<div className="flex items-center justify-between gap-6">
							<div>
								<div className="flex items-center gap-2 text-sm font-medium">
									<Zap className="h-4 w-4 text-brand" />
									{t("profileSettings.continuous.title")}
								</div>
								<div className="mt-1 text-sm text-muted-foreground">
									{t("profileSettings.continuous.description")}
								</div>
							</div>
							<Switch
								checked={settings.continuousBackupEnabled}
								onCheckedChange={(continuousBackupEnabled) =>
									void applySettings({ continuousBackupEnabled })
								}
								aria-label={t("profileSettings.continuous.title")}
							/>
						</div>

						{settings.continuousBackupEnabled ? (
							<div className="mt-4 space-y-4 rounded-xl bg-muted/45 p-4 ring-1 ring-inset ring-border/60">
								<div className="flex items-center justify-between gap-5">
									<div>
										<p className="text-xs font-medium">
											{t("profileSettings.continuous.stackTitle")}
										</p>
										<p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
											{t("profileSettings.continuous.stackDescription")}
										</p>
									</div>
									<Select
										value={String(settings.changeDebounceSeconds)}
										onValueChange={(value) =>
											void applySettings({
												changeDebounceSeconds: Number(value),
											})
										}
									>
										<SelectTrigger
											className="w-36"
											aria-label={t("profileSettings.continuous.stackTitle")}
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{[5, 10, 30].map((seconds) => (
												<SelectItem key={seconds} value={String(seconds)}>
													{t("profileSettings.continuous.seconds", {
														count: seconds,
													})}
												</SelectItem>
											))}
											<SelectItem value="60">
												{t("profileSettings.continuous.minute")}
											</SelectItem>
											<SelectItem value="300">
												{t("profileSettings.continuous.minutes", { count: 5 })}
											</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="border-t border-border/60 pt-4">
									<div className="flex items-center gap-2 text-xs font-medium">
										<Layers3 className="h-3.5 w-3.5 text-muted-foreground" />
										{t("profileSettings.continuous.layoutTitle")}
									</div>
									<div className="mt-2 grid gap-2 text-[11px] text-muted-foreground">
										<div className="flex items-center justify-between gap-3">
											<span>{t("profileSettings.continuous.fast")}</span>
											<code className="rounded-md bg-background/80 px-2 py-1 text-foreground/75">
												{t("profileSettings.continuous.fastPath")}
											</code>
										</div>
										<div className="flex items-center justify-between gap-3">
											<span>{t("profileSettings.continuous.major")}</span>
											<code className="rounded-md bg-background/80 px-2 py-1 text-foreground/75">
												{t("profileSettings.continuous.majorPath")}
											</code>
										</div>
									</div>
									<p className="mt-3 text-[11px] leading-5 text-muted-foreground">
										{t("profileSettings.continuous.catchUp")}
									</p>
								</div>
							</div>
						) : null}
					</div>

					<div className="py-4">
						<div className="mb-3 flex items-start gap-3">
							<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/80 ring-1 ring-inset ring-border/50">
								<BrainCircuit className="h-4.5 w-4.5 text-muted-foreground" />
							</div>
							<div>
								<p className="text-sm font-medium">{t("profileSettings.ai.title")}</p>
								<p className="mt-0.5 text-sm leading-5 text-muted-foreground">
										{t("profileSettings.ai.description")}
								</p>
							</div>
						</div>

						{aiAccounts.length === 0 ? (
							<div className="flex items-center justify-between gap-4 rounded-xl bg-muted/35 px-3.5 py-3">
								<p className="text-xs leading-5 text-muted-foreground">
									{t("profileSettings.ai.connectFirst")}
								</p>
								<Button
									variant="outline"
									size="sm"
									onClick={() => navigate("/integrations")}
								>
									<ExternalLink /> {t("profileSettings.ai.integrations")}
								</Button>
							</div>
						) : (
							<div className="space-y-3 rounded-xl bg-muted/25 p-3.5 ring-1 ring-inset ring-border/45">
								<div className="grid gap-2">
									<Label>{t("profileSettings.ai.connection")}</Label>
									<Select
										value={
											settings.aiAccountId === null
												? "none"
												: String(settings.aiAccountId)
										}
										onValueChange={(value) => {
											if (value === "none") {
												void applySettings({
													aiAccountId: null,
													aiMajorCommitMessagesEnabled: false,
													aiFastCommitMessagesEnabled: false,
												});
											} else {
												void applySettings({ aiAccountId: Number(value) });
											}
										}}
									>
										<SelectTrigger aria-label={t("profileSettings.ai.connection")}>
											<SelectValue placeholder={t("profileSettings.ai.choose")} />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">{t("profileSettings.ai.none")}</SelectItem>
											{aiAccounts.map((account) => (
												<SelectItem key={account.id} value={String(account.id)}>
													{getAiProvider(account.provider).name} ·{" "}
													{account.label} · {account.model}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="flex items-center justify-between gap-5 border-t border-border/55 pt-3">
									<div>
										<p className="text-xs font-medium">{t("profileSettings.ai.majorTitle")}</p>
										<p className="mt-0.5 text-xs leading-5 text-muted-foreground">
											{t("profileSettings.ai.majorDescription")}
										</p>
									</div>
									<Switch
										checked={settings.aiMajorCommitMessagesEnabled}
										disabled={settings.aiAccountId === null}
										onCheckedChange={(checked) =>
											void applySettings({
												aiMajorCommitMessagesEnabled: checked,
											})
										}
										aria-label={t("profileSettings.ai.majorToggle")}
									/>
								</div>

								<div className="flex items-center justify-between gap-5 border-t border-border/55 pt-3">
									<div>
										<p className="text-xs font-medium">{t("profileSettings.ai.fastTitle")}</p>
										<p className="mt-0.5 text-xs leading-5 text-muted-foreground">
											{t("profileSettings.ai.fastDescription")}
										</p>
									</div>
									<Switch
										checked={settings.aiFastCommitMessagesEnabled}
										disabled={
											settings.aiAccountId === null ||
											!settings.continuousBackupEnabled
										}
										onCheckedChange={(checked) =>
											void applySettings({
												aiFastCommitMessagesEnabled: checked,
											})
										}
										aria-label={t("profileSettings.ai.fastToggle")}
									/>
								</div>
							</div>
						)}
					</div>
					<SettingRow
						title={t("profileSettings.notifications.title")}
						description={t("profileSettings.notifications.description")}
					>
						<Switch
							checked={settings.notificationsEnabled}
							onCheckedChange={(checked) =>
								void applySettings({ notificationsEnabled: checked })
							}
							aria-label={t("profileSettings.notifications.toggle")}
						/>
					</SettingRow>
				</div>
			)}

			<Separator className="my-5" />

			<h3 className="mb-2 text-sm font-semibold text-destructive">
				{t("profileSettings.danger")}
			</h3>
			<div className="flex items-center justify-between rounded-xl border border-destructive/30 p-4">
				<div className="text-sm text-muted-foreground">
					{t("profileSettings.deleteDescription")}
				</div>
				<Button
					variant="destructive"
					onClick={() => setConfirmDelete(true)}
					className="shrink-0"
				>
					{t("profileSettings.delete")}
				</Button>
			</div>

			{error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

			<Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("profileSettings.deleteTitle", { name: profile.name })}</DialogTitle>
						<DialogDescription>
							{t("profileSettings.deleteConfirmDescription")}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="pt-2">
						<Button
							variant="ghost"
							onClick={() => setConfirmDelete(false)}
							disabled={deleting}
						>
							{t("common.cancel")}
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={deleting}
						>
							{deleting ? <Loader2 className="animate-spin" /> : null}
							{t("profileSettings.delete")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
