import { listen } from "@tauri-apps/api/event";
import { FolderCog, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { AutomaticProfileRuleCard } from "@/features/automaticProfiles/components/AutomaticProfileRuleCard";
import { AutomaticProfileRuleDialog } from "@/features/automaticProfiles/components/AutomaticProfileRuleDialog";
import { automaticProfilesCopy } from "@/features/automaticProfiles/copy";
import { automaticRuleInput } from "@/features/automaticProfiles/ruleInput";
import { useTranslation } from "@/i18n";
import { useAiStore } from "@/stores/ai";
import { useAutomaticProfilesStore } from "@/stores/automaticProfiles";
import { useExcludesStore } from "@/stores/excludes";
import { useIntegrationsStore } from "@/stores/integrations";
import type {
	AutomaticProfileRule,
	SaveAutomaticProfileRuleInput,
} from "@/types";
import { toAppError } from "@/types/errors";

export function AutomaticProfilesPage() {
	const { language } = useTranslation();
	const copy = automaticProfilesCopy(language);
	const store = useAutomaticProfilesStore();
	const integrations = useIntegrationsStore();
	const excludes = useExcludesStore();
	const ai = useAiStore();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingRule, setEditingRule] = useState<AutomaticProfileRule | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	useEffect(() => {
		if (!store.hasLoaded) void store.load();
	}, [store.hasLoaded, store.load]);
	useEffect(() => {
		if (!integrations.hasLoaded) void integrations.load();
	}, [integrations.hasLoaded, integrations.load]);
	useEffect(() => {
		if (!excludes.hasLoaded) void excludes.load();
	}, [excludes.hasLoaded, excludes.load]);
	useEffect(() => {
		if (!ai.hasLoaded) void ai.load();
	}, [ai.hasLoaded, ai.load]);
	useEffect(() => {
		let disposed = false;
		let unlisten: (() => void) | undefined;
		void listen<AutomaticProfileRule>("automatic-profiles-changed", (event) => {
			if (!disposed) store.upsert(event.payload);
		}).then((dispose) => {
			if (disposed) dispose();
			else unlisten = dispose;
		});
		return () => {
			disposed = true;
			unlisten?.();
		};
	}, [store.upsert]);

	const save = async (input: SaveAutomaticProfileRuleInput) => {
		setActionError(null);
		if (editingRule) await store.update(editingRule.id, input);
		else await store.create(input);
	};

	const toggle = async (rule: AutomaticProfileRule) => {
		setActionError(null);
		try {
			await store.update(rule.id, {
				...automaticRuleInput(rule),
				enabled: !rule.enabled,
			});
		} catch (error) {
			setActionError(toAppError(error).message);
		}
	};

	const remove = async (rule: AutomaticProfileRule) => {
		const generatedCount = rule.members.filter(
			(member) => member.profileId !== null,
		).length;
		if (
			!window.confirm(
				copy.detachConfirm.replace("{count}", String(generatedCount)),
			)
		)
			return;
		setActionError(null);
		try {
			await store.remove(rule.id);
		} catch (error) {
			setActionError(toAppError(error).message);
		}
	};

	return (
		<div>
			<PageHeader
				title={copy.title}
				description={copy.description}
				actions={<Button onClick={() => { setEditingRule(null); setDialogOpen(true); }}><Plus />{copy.newRule}</Button>}
			/>

			{actionError || store.error ? (
				<div className="mb-4 rounded-2xl bg-destructive/[0.06] px-4 py-3 text-sm text-destructive">
					{actionError ?? store.error?.message}
				</div>
			) : null}

			{store.isLoading && !store.hasLoaded ? (
				<div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
			) : store.rules.length === 0 ? (
				<EmptyState
					icon={FolderCog}
					title={copy.emptyTitle}
					description={copy.emptyDescription}
					action={<Button onClick={() => { setEditingRule(null); setDialogOpen(true); }}><Plus />{copy.newRule}</Button>}
				/>
			) : (
				<div className="space-y-4">
					{store.rules.map((rule) => (
						<AutomaticProfileRuleCard
							key={rule.id}
							rule={rule}
							syncing={store.syncingIds.includes(rule.id)}
							onEdit={() => { setEditingRule(rule); setDialogOpen(true); }}
							onSync={() => { setActionError(null); void store.sync(rule.id).catch((error) => setActionError(toAppError(error).message)); }}
							onToggle={() => void toggle(rule)}
							onRemove={() => void remove(rule)}
						/>
					))}
					<p className="px-1 text-[11px] text-muted-foreground">{copy.keptNotice}</p>
				</div>
			)}

			<AutomaticProfileRuleDialog
				open={dialogOpen}
				rule={editingRule}
				onOpenChange={setDialogOpen}
				onSave={save}
			/>
		</div>
	);
}
