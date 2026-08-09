import {
	Clock3,
	Languages,
	Loader2,
	Monitor,
	Moon,
	PanelTopClose,
	Power,
	Radar,
	Sun,
} from "lucide-react";
import { useEffect } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UpdateSettingsCard } from "@/features/updater/components/UpdateSettingsCard";
import { DatabaseMaintenanceCard } from "@/features/settings/components/DatabaseMaintenanceCard";
import { useAppInfo } from "@/hooks/useAppInfo";
import { LANGUAGES, type TranslationKey, useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings";
import type { AppLanguage, AppTheme } from "@/types";

function ThemePreviewBase({ mode, style }: { mode: 'light' | 'dark', style?: React.CSSProperties }) {
	const isDark = mode === 'dark';
	const bg = isDark ? 'bg-[#525252]' : 'bg-[#f5f5f5]';
	const windowBg = isDark ? 'bg-[#262626]' : 'bg-white';
	const lineTop = isDark ? 'bg-[#737373]' : 'bg-[#e5e5e5]';
	const lineCard = isDark ? 'bg-[#404040]' : 'bg-[#e5e5e5]';

	return (
		<div className={cn("absolute inset-0 flex flex-col items-center pt-4 overflow-hidden", bg)} style={style}>
			<div className={cn("w-12 h-1.5 rounded-full mb-1.5", lineTop)} />
			<div className={cn("w-24 h-1.5 rounded-full mb-4", lineTop)} />
			<div className={cn("w-[85%] flex-1 rounded-t-xl p-4 flex flex-col gap-3.5 shadow-sm", windowBg)}>
				<div className="flex flex-col gap-1.5">
					<div className={cn("w-14 h-2 rounded-full", lineCard)} />
					<div className={cn("w-28 h-2 rounded-full opacity-60", lineCard)} />
				</div>
				<div className="flex flex-col gap-1.5">
					<div className={cn("w-14 h-2 rounded-full", lineCard)} />
					<div className={cn("w-28 h-2 rounded-full opacity-60", lineCard)} />
				</div>
				<div className="flex flex-col gap-1.5">
					<div className={cn("w-14 h-2 rounded-full", lineCard)} />
					<div className={cn("w-28 h-2 rounded-full opacity-60", lineCard)} />
				</div>
			</div>
		</div>
	);
}

function ThemePreview({ theme }: { theme: 'light' | 'dark' | 'system' }) {
	if (theme === 'system') {
		return (
			<div className="relative w-full aspect-[1.3] rounded-[calc(0.8rem+2px)] overflow-hidden bg-white">
				<ThemePreviewBase mode="light" style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }} />
				<ThemePreviewBase mode="dark" style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }} />
			</div>
		)
	}
	return (
		<div className="relative w-full aspect-[1.3] rounded-[calc(0.8rem+2px)] overflow-hidden">
			<ThemePreviewBase mode={theme} />
		</div>
	)
}

const THEMES = [
	{
		value: "system",
		label: "settings.theme.system",
		description: "settings.theme.systemDescription",
		icon: Monitor,
	},
	{
		value: "light",
		label: "settings.theme.light",
		description: "settings.theme.lightDescription",
		icon: Sun,
	},
	{
		value: "dark",
		label: "settings.theme.dark",
		description: "settings.theme.darkDescription",
		icon: Moon,
	},
] satisfies Array<{
	value: AppTheme;
	label: TranslationKey;
	description: TranslationKey;
	icon: typeof Sun;
}>;

const TIME_ZONES = [
	"system",
	"UTC",
	"UTC-12:00",
	"UTC-11:00",
	"UTC-10:00",
	"UTC-09:00",
	"UTC-08:00",
	"UTC-07:00",
	"UTC-06:00",
	"UTC-05:00",
	"UTC-04:00",
	"UTC-03:00",
	"UTC-02:00",
	"UTC-01:00",
	"UTC+01:00",
	"UTC+02:00",
	"UTC+03:00",
	"UTC+04:00",
	"UTC+05:00",
	"UTC+05:30",
	"UTC+06:00",
	"UTC+07:00",
	"UTC+08:00",
	"UTC+09:00",
	"UTC+10:00",
	"UTC+11:00",
	"UTC+12:00",
	"UTC+13:00",
	"UTC+14:00",
] as const;

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-baseline justify-between gap-6 first:pt-0 last:pb-0 py-2">
			<span className="shrink-0 text-sm ">{label}</span>
			<span className="select-text truncate text-sm font-medium text-muted-foreground" title={value}>
				{value}
			</span>
		</div>
	);
}

function SettingRow({
	icon: Icon,
	title,
	description,
	checked,
	disabled,
	onCheckedChange,
}: {
	icon: typeof Power;
	title: string;
	description: string;
	checked: boolean;
	disabled: boolean;
	onCheckedChange(value: boolean): void;
}) {
	return (
		<div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/80 ring-1 ring-inset ring-border/50">
				<Icon className="h-4 w-4 text-muted-foreground" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">{title}</p>
				<p className="mt-1 text-xs leading-5 text-muted-foreground">
					{description}
				</p>
			</div>
			<Switch
				checked={checked}
				disabled={disabled}
				onCheckedChange={onCheckedChange}
				aria-label={title}
			/>
		</div>
	);
}

function PreferenceRow({
	icon: Icon,
	title,
	description,
	children,
}: {
	icon: typeof Languages;
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid grid-cols-[40px_minmax(0,1fr)_240px] items-center gap-4 py-4 first:pt-0 last:pb-0">
			<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/80 ring-1 ring-inset ring-border/50">
				<Icon className="h-4 w-4 text-muted-foreground" />
			</div>
			<div className="min-w-0">
				<p className="text-sm font-medium">{title}</p>
				<p className="mt-1 text-xs leading-5 text-muted-foreground">
					{description}
				</p>
			</div>
			{children}
		</div>
	);
}

export function SettingsPanel({
	title,
	children
}: {
	title?: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2">
			{title && (<div>
				<p className="text-sm font-medium">{title}</p>
			</div>)}
			<div className="flex-1 flex flex-col gap-1">
				{children}
			</div>
		</div>
	)
}

export function SettingsRow({
	children
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="first:rounded-t-3xl! p-4 last:rounded-b-3xl! bg-card last:rounded-t-xl first:rounded-b-xl not-last:rounded-xl not-first:rounded-xl">
			{children}
		</div>
	)
}

export function SettingsPage() {
	const { info, error: infoError } = useAppInfo();
	const { t } = useTranslation();
	const settings = useSettingsStore((state) => state.settings);
	const isLoading = useSettingsStore((state) => state.isLoading);
	const isSaving = useSettingsStore((state) => state.isSaving);
	const error = useSettingsStore((state) => state.error);
	const load = useSettingsStore((state) => state.load);
	const update = useSettingsStore((state) => state.update);
	const systemTimeZone =
		Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";

	useEffect(() => {
		if (!settings && !isLoading) void load();
	}, [settings, isLoading, load]);

	return (
		<div>
			<PageHeader
				title={t("settings.title")}
				description={t("settings.description")}
			/>

			<div className="space-y-8 pb-12">
				<SettingsPanel
					title={t("settings.appearance.title")}
				>
					{!settings && isLoading ? (
						<div className="flex justify-center py-7">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					) : settings ? (
						<SettingsRow>
							<div className="grid grid-cols-3 gap-5">
								{THEMES.map(({ value, label }) => {
									const selected = settings.theme === value;
									return (
										<button
											key={value}
											type="button"
											aria-pressed={selected}
											disabled={isSaving}
											onClick={() => void update({ theme: value })}
											className="flex flex-col items-center gap-3 transition-all disabled:opacity-60 group outline-none"
										>
											<div className={cn(
												"w-full rounded-xl p-[3px] transition-colors",
												selected ? "bg-foreground" : "bg-transparent group-hover:bg-foreground/10 group-focus-visible:bg-foreground/20"
											)}>
												<ThemePreview theme={value} />
											</div>
											<p className={cn(
												"text-[13px] font-medium transition-colors",
												selected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
											)}>
												{t(label)}
											</p>
										</button>
									);
								})}
							</div>
						</SettingsRow>
					) : null}
				</SettingsPanel>

				<SettingsPanel
					title={t("settings.region.title")}
				>
					{settings ? (
						<>
							<SettingsRow>
								<PreferenceRow
									icon={Languages}
									title={t("settings.language.label")}
									description={t("settings.language.description")}
								>
									<Select
										value={settings.language}
										disabled={isSaving}
										onValueChange={(language) =>
											void update({ language: language as AppLanguage })
										}
									>
										<SelectTrigger aria-label={t("settings.language.label")}>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="system">
												{t("settings.language.system")}
											</SelectItem>
											{LANGUAGES.map((language) => (
												<SelectItem key={language.code} value={language.code}>
													{language.nativeName}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</PreferenceRow>
							</SettingsRow>
							<SettingsRow>
								<PreferenceRow
									icon={Clock3}
									title={t("settings.timeZone.label")}
									description={t("settings.timeZone.description")}
								>
									<Select
										value={settings.timeZone}
										disabled={isSaving}
										onValueChange={(timeZone) => void update({ timeZone })}
									>
										<SelectTrigger aria-label={t("settings.timeZone.label")}>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{TIME_ZONES.map((timeZone) => (
												<SelectItem key={timeZone} value={timeZone}>
													{timeZone === "system"
														? `${t("settings.timeZone.system")} (${systemTimeZone})`
														: timeZone}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</PreferenceRow>
							</SettingsRow>
						</>
					) : null}
				</SettingsPanel>

				<UpdateSettingsCard currentVersion={info?.version} />

				<DatabaseMaintenanceCard />

				<SettingsPanel
					title={t("settings.startup.title")}
				>
					{settings ? (
						<>
							<SettingsRow>
								<SettingRow
									icon={Power}
									title={t("settings.startup.launch")}
									description={t("settings.startup.launchDescription")}
									checked={settings.launchAtStartup}
									disabled={isSaving}
									onCheckedChange={(launchAtStartup) =>
										void update({ launchAtStartup })
									}
								/>
							</SettingsRow>
							<SettingsRow>
								<SettingRow
									icon={PanelTopClose}
									title={t("settings.startup.close")}
									description={t("settings.startup.closeDescription")}
									checked={settings.minimizeToTray}
									disabled={isSaving}
									onCheckedChange={(minimizeToTray) =>
										void update({ minimizeToTray })
									}
								/>
							</SettingsRow>
						</>
					) : null}
					{error ? (
						<p className="mt-4 text-sm text-destructive">{error.message}</p>
					) : null}
				</SettingsPanel>

				<SettingsPanel
					title={t("settings.privacy.title")}
				>
					{settings ? (
						<SettingsRow>
							<SettingRow
								icon={Radar}
								title={t("settings.privacy.telemetry")}
								description={t("settings.privacy.telemetryDescription")}
								checked={settings.telemetryEnabled}
								disabled={isSaving}
								onCheckedChange={(telemetryEnabled) =>
									void update({ telemetryEnabled })
								}
							/>
						</SettingsRow>
					) : null}
				</SettingsPanel>

				<SettingsPanel
					title={t("settings.application.title")}
				>
					{infoError ? (
						<p className="text-sm text-destructive">{infoError.message}</p>
					) : info ? (
						<>
							<SettingsRow>
								<div className="divide-y">
									<InfoRow
										label={t("settings.application.version")}
										value={info.version}
									/>
									<InfoRow label="Tauri" value={info.tauriVersion} />
									<InfoRow
										label={t("settings.application.platform")}
										value={`${info.platform} (${info.arch})`}
									/>
									<InfoRow
										label={t("settings.application.dataDirectory")}
										value={info.dataDir}
									/>
									<InfoRow
										label={t("settings.application.database")}
										value={info.databasePath}
									/>
									<InfoRow
										label={t("settings.application.logs")}
										value={info.logDir}
									/>
								</div>
							</SettingsRow>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							{t("common.loading")}
						</p>
					)}
				</SettingsPanel>
			</div>
		</div>
	);
}
