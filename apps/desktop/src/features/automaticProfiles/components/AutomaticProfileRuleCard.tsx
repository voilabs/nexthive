import {
	AlertTriangle,
	File,
	Folder,
	Loader2,
	Pause,
	Pencil,
	Play,
	RefreshCw,
	Trash2,
} from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { automaticProfilesCopy } from "@/features/automaticProfiles/copy";
import { useTranslation } from "@/i18n";
import { cn, formatDateTime } from "@/lib/utils";
import type { AutomaticProfileRule } from "@/types";

interface Props {
	rule: AutomaticProfileRule;
	syncing: boolean;
	onEdit(): void;
	onSync(): void;
	onToggle(): void;
	onRemove(): void;
}

export function AutomaticProfileRuleCard({
	rule,
	syncing,
	onEdit,
	onSync,
	onToggle,
	onRemove,
}: Props) {
	const { language } = useTranslation();
	const copy = automaticProfilesCopy(language);
	const active = rule.members.filter((member) => member.status === "active").length;
	const needsAttention = rule.members.filter(
		(member) => member.status === "error" || member.status === "missing",
	).length;

	return (
		<section className="overflow-hidden rounded-xl border border-border/70 bg-card">
			<div className="flex items-start gap-4 px-5 py-4">
				<div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.055]">
					<Folder className="h-4.5 w-4.5 text-foreground/75" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<h2 className="truncate text-sm font-semibold">{rule.name}</h2>
						<Badge variant={rule.enabled ? "success" : "secondary"}>
							{rule.enabled ? copy.active : copy.paused}
						</Badge>
						{needsAttention > 0 ? (
							<Badge variant="warning">
								<AlertTriangle />
								{needsAttention}
							</Badge>
						) : null}
					</div>
					<p className="mt-1 truncate font-mono text-[11px] text-muted-foreground" title={rule.rootPath}>
						{rule.rootPath}
					</p>
					<div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
						<span>{active}/{rule.members.length} {copy.profiles}</span>
						<span>·</span>
						<span>{copy.lastChecked}: {rule.lastReconciledAt ? formatDateTime(rule.lastReconciledAt) : copy.never}</span>
						{rule.continuousBackupEnabled ? <><span>·</span><span>{rule.changeDebounceSeconds}s stack</span></> : null}
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<Button size="sm" variant="ghost" onClick={onSync} disabled={syncing || !rule.enabled}>
						{syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
						{copy.sync}
					</Button>
					<Button size="sm" variant="ghost" onClick={onEdit}><Pencil />{copy.edit}</Button>
					<Button size="icon" variant="ghost" onClick={onToggle} aria-label={rule.enabled ? copy.pause : copy.resume}>
						{rule.enabled ? <Pause /> : <Play />}
					</Button>
					<Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label={copy.remove}>
						<Trash2 />
					</Button>
				</div>
			</div>

			{rule.lastError ? (
				<div className="border-t border-warning/20 bg-warning/[0.06] px-5 py-2.5 text-xs text-warning">
					{rule.lastError}
				</div>
			) : null}

			<div className="max-h-64 overflow-y-auto border-t border-border/60 bg-muted/[0.18] px-5 py-2">
				{rule.members.length === 0 ? (
					<p className="py-3 text-xs text-muted-foreground">{copy.never}</p>
				) : (
					<ul className="divide-y divide-border/50">
						{rule.members.map((member) => {
							const Icon = member.entryKind === "root_files" ? File : Folder;
							const row = (
								<div className="flex min-w-0 items-center gap-3 py-2.5">
									<Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
									<div className="min-w-0 flex-1">
										<p className="truncate text-xs font-medium">{member.entryName}</p>
										<p className="truncate text-[10px] text-muted-foreground" title={member.sourcePath}>
											{member.entryKind === "root_files" ? copy.directFiles : copy.folderProfile}
											{member.errorMessage ? ` · ${member.errorMessage}` : ""}
										</p>
									</div>
									<span className={cn("text-[10px] font-medium", member.status === "active" ? "text-success" : member.status === "error" ? "text-warning" : "text-muted-foreground")}>
										{member.status === "active" ? copy.active : member.status === "error" ? copy.error : copy.missing}
									</span>
								</div>
							);
							return <li key={member.id}>{member.profileId ? <Link to={`/backups/${member.profileId}`} className="block transition-colors hover:text-foreground">{row}</Link> : row}</li>;
						})}
					</ul>
				)}
			</div>
		</section>
	);
}
