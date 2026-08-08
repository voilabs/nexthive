import { open as openFolderDialog } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
import { automaticProfilesCopy } from "@/features/automaticProfiles/copy";
import { getProvider } from "@/features/integrations/providers";
import { useTranslation } from "@/i18n";
import { useAiStore } from "@/stores/ai";
import { useExcludesStore } from "@/stores/excludes";
import { useIntegrationsStore } from "@/stores/integrations";
import type {
	AutomaticProfileRule,
	SaveAutomaticProfileRuleInput,
} from "@/types";
import { toAppError } from "@/types/errors";

interface Props {
	open: boolean;
	rule: AutomaticProfileRule | null;
	onOpenChange(open: boolean): void;
	onSave(input: SaveAutomaticProfileRuleInput): Promise<void>;
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
		<div className="flex items-center justify-between gap-5 py-2">
			<div>
				<p className="text-sm font-medium">{title}</p>
				{description ? (
					<p className="mt-0.5 text-xs leading-5 text-muted-foreground">
						{description}
					</p>
				) : null}
			</div>
			<Switch
				checked={checked}
				disabled={disabled}
				onCheckedChange={onCheckedChange}
			/>
		</div>
	);
}

export function AutomaticProfileRuleDialog({
	open,
	rule,
	onOpenChange,
	onSave,
}: Props) {
	const { language } = useTranslation();
	const copy = automaticProfilesCopy(language);
	const accounts = useIntegrationsStore((state) => state.accounts).filter(
		(account) => account.authMethod === "pat",
	);
	const excludeProfiles = useExcludesStore((state) => state.profiles);
	const aiAccounts = useAiStore((state) => state.accounts);
	const [name, setName] = useState("");
	const [rootPath, setRootPath] = useState("");
	const [integrationAccount, setIntegrationAccount] = useState("none");
	const [branch, setBranch] = useState("main");
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
		if (!open) return;
		setName(rule?.name ?? "");
		setRootPath(rule?.rootPath ?? "");
		setIntegrationAccount(rule?.integrationAccountId?.toString() ?? "none");
		setBranch(rule?.branch ?? "main");
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
	}, [open, rule]);

	const selectedAccount = useMemo(
		() => accounts.find((account) => account.id === Number(integrationAccount)),
		[accounts, integrationAccount],
	);
	const canSubmit =
		!submitting &&
		name.trim().length > 0 &&
		rootPath.trim().length > 0 &&
		(!autoRepositories || selectedAccount !== undefined) &&
		debounceSeconds >= 5 &&
		debounceSeconds <= 3600 &&
		(!(aiMajor || aiFast) || aiAccount !== "none");

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
				integrationAccountId:
					integrationAccount === "none" ? null : Number(integrationAccount),
				branch: branch.trim() || null,
				excludeProfileId:
					excludeProfile === "none" ? null : Number(excludeProfile),
				backupTime: dailyEnabled ? backupTime : null,
				backupOnStartup,
				notificationsEnabled: notifications,
				continuousBackupEnabled: continuous,
				changeDebounceSeconds: debounceSeconds,
				aiAccountId: aiAccount === "none" ? null : Number(aiAccount),
				aiMajorCommitMessagesEnabled: aiMajor,
				aiFastCommitMessagesEnabled: aiFast,
				autoCreateRepositories: autoRepositories,
				enabled,
			});
			onOpenChange(false);
		} catch (cause) {
			setError(toAppError(cause).message);
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
				<form onSubmit={submit}>
					<DialogHeader>
						<DialogTitle>{rule ? copy.edit : copy.newRule}</DialogTitle>
						<DialogDescription>{copy.identityDescription}</DialogDescription>
					</DialogHeader>

					<div className="space-y-5 py-5">
						<section className="space-y-3">
							<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
								{copy.identity}
							</p>
							<div className="grid grid-cols-2 gap-3">
								<div className="grid gap-2">
									<Label htmlFor="automatic-name">{copy.name}</Label>
									<Input
										id="automatic-name"
										value={name}
										onChange={(event) => setName(event.target.value)}
										placeholder="Desktop"
										autoFocus
									/>
									<p className="text-[11px] text-muted-foreground">{copy.nameHint}</p>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="automatic-root">{copy.root}</Label>
									<div className="flex gap-2">
										<Input
											id="automatic-root"
											value={rootPath}
											onChange={(event) => setRootPath(event.target.value)}
											placeholder="C:\\Users\\User\\Desktop"
										/>
										<Button type="button" variant="outline" onClick={() => void chooseRoot()}>
											<FolderOpen />
											{copy.browse}
										</Button>
									</div>
								</div>
							</div>
						</section>

						<Separator />
						<section className="space-y-3">
							<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
								{copy.destination}
							</p>
							<div className="grid grid-cols-2 gap-3">
								<div className="grid gap-2">
									<Label>{copy.account}</Label>
									<Select value={integrationAccount} onValueChange={setIntegrationAccount}>
										<SelectTrigger><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectItem value="none">{copy.noAccount}</SelectItem>
											{accounts.map((account) => (
												<SelectItem key={account.id} value={String(account.id)}>
													{getProvider(account.provider).name} · {account.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="automatic-branch">{copy.branch}</Label>
									<Input id="automatic-branch" value={branch} onChange={(event) => setBranch(event.target.value)} />
								</div>
							</div>
							<ToggleRow
								title={copy.autoRepositories}
								description={copy.autoRepositoriesDescription}
								checked={autoRepositories}
								onCheckedChange={setAutoRepositories}
							/>
						</section>

						<Separator />
						<section className="space-y-2">
							<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
								{copy.schedule}
							</p>
							<ToggleRow title={copy.daily} checked={dailyEnabled} onCheckedChange={setDailyEnabled} />
							{dailyEnabled ? (
								<div className="grid max-w-[220px] gap-2 pb-2">
									<Label htmlFor="automatic-time">{copy.dailyTime}</Label>
									<Input id="automatic-time" type="time" value={backupTime} onChange={(event) => setBackupTime(event.target.value)} />
								</div>
							) : null}
							<ToggleRow title={copy.onStartup} checked={backupOnStartup} onCheckedChange={setBackupOnStartup} />
							<ToggleRow title={copy.continuous} checked={continuous} onCheckedChange={setContinuous} />
							{continuous ? (
								<div className="grid max-w-[220px] gap-2 pb-2">
									<Label htmlFor="automatic-debounce">{copy.debounce}</Label>
									<Input id="automatic-debounce" type="number" min={5} max={3600} value={debounceSeconds} onChange={(event) => setDebounceSeconds(Number(event.target.value))} />
								</div>
							) : null}
							<ToggleRow title={copy.notifications} checked={notifications} onCheckedChange={setNotifications} />
						</section>

						<Separator />
						<section className="space-y-3">
							<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
								{copy.filters}
							</p>
							<div className="grid grid-cols-2 gap-3">
								<div className="grid gap-2">
									<Label>{copy.excludeProfile}</Label>
									<Select value={excludeProfile} onValueChange={setExcludeProfile}>
										<SelectTrigger><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectItem value="none">{copy.noExclude}</SelectItem>
											{excludeProfiles.map((profile) => <SelectItem key={profile.id} value={String(profile.id)}>{profile.name}</SelectItem>)}
										</SelectContent>
									</Select>
								</div>
								<div className="grid gap-2">
									<Label>{copy.aiAccount}</Label>
									<Select value={aiAccount} onValueChange={(value) => { setAiAccount(value); if (value === "none") { setAiMajor(false); setAiFast(false); } }}>
										<SelectTrigger><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectItem value="none">{copy.noAi}</SelectItem>
											{aiAccounts.map((account) => <SelectItem key={account.id} value={String(account.id)}>{account.label} · {account.model}</SelectItem>)}
										</SelectContent>
									</Select>
								</div>
							</div>
							<ToggleRow title={copy.aiMajor} checked={aiMajor} disabled={aiAccount === "none"} onCheckedChange={setAiMajor} />
							<ToggleRow title={copy.aiFast} checked={aiFast} disabled={aiAccount === "none"} onCheckedChange={setAiFast} />
							<ToggleRow title={copy.enabled} checked={enabled} onCheckedChange={setEnabled} />
						</section>

						{error ? <p className="text-sm text-destructive">{error}</p> : null}
					</div>

					<DialogFooter>
						<Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
							{copy.cancel}
						</Button>
						<Button type="submit" disabled={!canSubmit}>
							{submitting ? <Loader2 className="animate-spin" /> : null}
							{submitting ? (rule ? copy.saving : copy.creating) : rule ? copy.save : copy.create}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
