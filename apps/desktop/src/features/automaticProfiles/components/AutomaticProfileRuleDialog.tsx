import { open as openFolderDialog } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { automaticProfilesCopy } from "@/features/automaticProfiles/copy";
import { getProvider } from "@/features/integrations/providers";
import { useTranslation } from "@/i18n";
import { useAiStore } from "@/stores/ai";
import { useExcludesStore } from "@/stores/excludes";
import { useIntegrationsStore } from "@/stores/integrations";
import { useS3Store } from "@/stores/s3";
import type {
	AutomaticProfileRule,
	SaveAutomaticProfileRuleInput,
} from "@/types";
import { toAppError } from "@/types/errors";

interface Props {
	rule: AutomaticProfileRule | null;
	onSave(input: SaveAutomaticProfileRuleInput): Promise<void>;
	onCancel(): void;
}

function FormRow({
	title,
	description,
	disabled,
	children,
}: {
	title: string;
	description?: string;
	disabled?: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className={`grid grid-cols-[1fr_minmax(0,1.5fr)] gap-8 items-start py-5 first:pt-0 last:pb-0 ${disabled ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
			<div>
				<Label className="text-[14px] font-medium text-foreground/90">{title}</Label>
				{description ? (
					<p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground/80">
						{description}
					</p>
				) : null}
			</div>
			<div className="flex w-full min-h-[40px] items-center">
				{children}
			</div>
		</div>
	);
}

function ToggleRow({
	title,
	description,
	checked,
	disabled,
	onCheckedChange,
}: {
	title: string;
	description?: string;
	checked: boolean;
	disabled?: boolean;
	onCheckedChange(value: boolean): void;
}) {
	return (
		<FormRow title={title} description={description} disabled={disabled}>
			<Switch
				checked={checked}
				disabled={disabled}
				onCheckedChange={onCheckedChange}
			/>
		</FormRow>
	);
}

export function AutomaticProfileRuleForm({
	rule,
	onSave,
	onCancel,
}: Props) {
	const { language } = useTranslation();
	const copy = automaticProfilesCopy(language);
	const accounts = useIntegrationsStore((state) => state.accounts).filter(
		(account) => account.authMethod === "pat",
	);
	const excludeProfiles = useExcludesStore((state) => state.profiles);
	const aiAccounts = useAiStore((state) => state.accounts);
	const s3Accounts = useS3Store((state) => state.accounts);
	const [name, setName] = useState("");
	const [rootPath, setRootPath] = useState("");
	const [destination, setDestination] = useState("none");
	const [branch, setBranch] = useState("main");
	const [s3Prefix, setS3Prefix] = useState("");
	const [autoRepositories, setAutoRepositories] = useState(true);
	const [dailyEnabled, setDailyEnabled] = useState(true);
	const [backupTime, setBackupTime] = useState("02:00");
	const [backupOnStartup, setBackupOnStartup] = useState(true);
	const [continuous, setContinuous] = useState(true);
	const [debounceSeconds, setDebounceSeconds] = useState(10);
	const [notifications, setNotifications] = useState(true);
	const [excludeProfile, setExcludeProfile] = useState("none");
	const [aiAccount, setAiAccount] = useState("none");
	const [aiMajor, setAiMajor] = useState(false);
	const [aiFast, setAiFast] = useState(false);
	const [enabled, setEnabled] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setName(rule?.name ?? "");
		setRootPath(rule?.rootPath ?? "");
		setDestination(
			rule?.targetType === "s3" && rule.s3AccountId !== null
				? `s3:${rule.s3AccountId}`
				: rule?.integrationAccountId !== null && rule?.integrationAccountId !== undefined
					? `git:${rule.integrationAccountId}`
					: "none",
		);
		setBranch(rule?.branch ?? "main");
		setS3Prefix(rule?.s3Prefix ?? "");
		setAutoRepositories(rule?.autoCreateRepositories ?? true);
		setDailyEnabled(rule ? rule.backupTime !== null : true);
		setBackupTime(rule?.backupTime ?? "02:00");
		setBackupOnStartup(rule?.backupOnStartup ?? true);
		setContinuous(rule?.continuousBackupEnabled ?? true);
		setDebounceSeconds(rule?.changeDebounceSeconds ?? 10);
		setNotifications(rule?.notificationsEnabled ?? true);
		setExcludeProfile(rule?.excludeProfileId?.toString() ?? "none");
		setAiAccount(rule?.aiAccountId?.toString() ?? "none");
		setAiMajor(rule?.aiMajorCommitMessagesEnabled ?? false);
		setAiFast(rule?.aiFastCommitMessagesEnabled ?? false);
		setEnabled(rule?.enabled ?? true);
		setError(null);
		setSubmitting(false);
	}, [rule]);

	const targetType = destination.startsWith("s3:") ? "s3" : "git";
	const selectedAccount = useMemo(
		() => accounts.find((account) => `git:${account.id}` === destination),
		[accounts, destination],
	);
	const canSubmit =
		!submitting &&
		name.trim().length > 0 &&
		rootPath.trim().length > 0 &&
		destination !== "none" &&
		(targetType === "s3" || !autoRepositories || selectedAccount !== undefined) &&
		debounceSeconds >= 5 &&
		debounceSeconds <= 3600 &&
		(targetType === "s3" || !(aiMajor || aiFast) || aiAccount !== "none");

	const chooseRoot = async () => {
		const selected = await openFolderDialog({
			directory: true,
			multiple: false,
			title: copy.root,
		});
		if (typeof selected === "string") setRootPath(selected);
	};

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!canSubmit) return;
		setSubmitting(true);
		setError(null);
		try {
			await onSave({
				name: name.trim(),
				rootPath: rootPath.trim(),
				targetType,
				integrationAccountId: targetType === "git" ? Number(destination.slice(4)) : null,
				s3AccountId: targetType === "s3" ? Number(destination.slice(3)) : null,
				s3Prefix: targetType === "s3" ? s3Prefix.trim() || null : null,
				branch: targetType === "git" ? branch.trim() || null : null,
				excludeProfileId:
					excludeProfile === "none" ? null : Number(excludeProfile),
				backupTime: dailyEnabled ? backupTime : null,
				backupOnStartup,
				notificationsEnabled: notifications,
				continuousBackupEnabled: continuous,
				changeDebounceSeconds: debounceSeconds,
				aiAccountId: targetType === "git" && aiAccount !== "none" ? Number(aiAccount) : null,
				aiMajorCommitMessagesEnabled: targetType === "git" && aiMajor,
				aiFastCommitMessagesEnabled: targetType === "git" && aiFast,
				autoCreateRepositories: targetType === "git" && autoRepositories,
				enabled,
			});
			onCancel();
		} catch (cause) {
			setError(toAppError(cause).message);
			setSubmitting(false);
		}
	};

	return (
		<form onSubmit={submit} className="w-full space-y-10 pb-4">

			<div className="flex flex-col gap-2">
				<p className="text-sm font-medium">{copy.identity}</p>
				<div className="rounded-2xl border border-border/50 bg-card p-6 divide-y divide-border/40 shadow-sm">
					<FormRow title={copy.name} description={copy.nameHint}>
						<Input
							id="automatic-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="Desktop"
							className="h-10 bg-background/50"
							autoFocus
						/>
					</FormRow>
					<FormRow title={copy.root}>
						<div className="flex w-full gap-2">
							<Input
								id="automatic-root"
								value={rootPath}
								onChange={(event) => setRootPath(event.target.value)}
								placeholder="C:\\Users\\User\\Desktop"
								className="h-10 bg-background/50 w-full"
							/>
							<Button type="button" variant="outline" className="h-10 px-4 shrink-0" onClick={() => void chooseRoot()}>
								<FolderOpen className="mr-2 size-4" />
								{copy.browse}
							</Button>
						</div>
					</FormRow>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<p className="text-sm font-medium">{copy.destination}</p>
				<div className="rounded-2xl border border-border/50 bg-card p-6 divide-y divide-border/40 shadow-sm">
					<FormRow title={copy.account}>
						<Select value={destination} onValueChange={setDestination}>
							<SelectTrigger className="h-10 bg-background/50 w-full"><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="none">{copy.noAccount}</SelectItem>
								{accounts.map((account) => (
									<SelectItem key={`git:${account.id}`} value={`git:${account.id}`}>
										{getProvider(account.provider).name} · {account.label}
									</SelectItem>
								))}
								{s3Accounts.map((account) => (
									<SelectItem key={`s3:${account.id}`} value={`s3:${account.id}`}>
										S3 · {account.label} · {account.bucket}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FormRow>
					{destination !== "none" && targetType === "git" ? (
						<>
							<FormRow title={copy.branch}>
								<Input id="automatic-branch" className="h-10 bg-background/50" value={branch} onChange={(event) => setBranch(event.target.value)} />
							</FormRow>
							<ToggleRow
								title={copy.autoRepositories}
								description={copy.autoRepositoriesDescription}
								checked={autoRepositories}
								onCheckedChange={setAutoRepositories}
							/>
						</>
					) : null}
					{targetType === "s3" ? (
						<FormRow title="S3 prefix">
							<Input value={s3Prefix} onChange={(event) => setS3Prefix(event.target.value)} className="h-10 bg-background/50" placeholder="automatic-backups" />
						</FormRow>
					) : null}
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<p className="text-sm font-medium">{copy.schedule}</p>
				<div className="rounded-2xl border border-border/50 bg-card p-6 divide-y divide-border/40 shadow-sm">
					<ToggleRow title={copy.daily} checked={dailyEnabled} onCheckedChange={setDailyEnabled} />
					{dailyEnabled ? (
						<FormRow title={copy.dailyTime}>
							<Input id="automatic-time" className="h-10 bg-background/50 max-w-[200px]" type="time" value={backupTime} onChange={(event) => setBackupTime(event.target.value)} />
						</FormRow>
					) : null}

					<ToggleRow title={copy.onStartup} checked={backupOnStartup} onCheckedChange={setBackupOnStartup} />

					<ToggleRow title={copy.continuous} checked={continuous} onCheckedChange={setContinuous} />
					{continuous ? (
						<FormRow title={copy.debounce}>
							<Input id="automatic-debounce" className="h-10 bg-background/50 max-w-[200px]" type="number" min={5} max={3600} value={debounceSeconds} onChange={(event) => setDebounceSeconds(Number(event.target.value))} />
						</FormRow>
					) : null}

					<ToggleRow title={copy.notifications} checked={notifications} onCheckedChange={setNotifications} />
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<p className="text-sm font-medium">{copy.filters}</p>
				<div className="rounded-2xl border border-border/50 bg-card p-6 divide-y divide-border/40 shadow-sm">
					<FormRow title={copy.excludeProfile}>
						<Select value={excludeProfile} onValueChange={setExcludeProfile}>
							<SelectTrigger className="h-10 bg-background/50 w-full"><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="none">{copy.noExclude}</SelectItem>
								{excludeProfiles.map((profile) => <SelectItem key={profile.id} value={String(profile.id)}>{profile.name}</SelectItem>)}
							</SelectContent>
						</Select>
					</FormRow>
					{targetType === "git" ? <FormRow title={copy.aiAccount}>
						<Select value={aiAccount} onValueChange={(value) => { setAiAccount(value); if (value === "none") { setAiMajor(false); setAiFast(false); } }}>
							<SelectTrigger className="h-10 bg-background/50 w-full"><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="none">{copy.noAi}</SelectItem>
								{aiAccounts.map((account) => <SelectItem key={account.id} value={String(account.id)}>{account.label} · {account.model}</SelectItem>)}
							</SelectContent>
						</Select>
					</FormRow> : null}
					{targetType === "git" ? <ToggleRow title={copy.aiMajor} checked={aiMajor} disabled={aiAccount === "none"} onCheckedChange={setAiMajor} /> : null}
					{targetType === "git" ? <ToggleRow title={copy.aiFast} checked={aiFast} disabled={aiAccount === "none"} onCheckedChange={setAiFast} /> : null}
					<ToggleRow title={copy.enabled} checked={enabled} onCheckedChange={setEnabled} />
				</div>
			</div>

			{error ? (
				<div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-medium text-destructive">
					{error}
				</div>
			) : null}

			<div className="sticky bottom-4 z-10 mt-8 flex items-center justify-end gap-3 rounded-2xl border border-border/50 bg-background/90 p-4 shadow-sm backdrop-blur-md">
				<Button type="button" variant="ghost" className="h-10 px-6 rounded-full" onClick={onCancel} disabled={submitting}>
					{copy.cancel}
				</Button>
				<Button type="submit" disabled={!canSubmit} className="h-10 px-8 rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/90">
					{submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
					{submitting ? (rule ? copy.saving : copy.creating) : rule ? copy.save : copy.create}
				</Button>
			</div>
		</form>
	);
}
