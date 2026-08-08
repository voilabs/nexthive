import { ChevronRight, LockKeyhole } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	AI_PROVIDERS,
	type AiProviderDefinition,
} from "@/features/integrations/aiProviders";
import {
	type IntegrationDefinition,
	PROVIDERS,
	STORAGE_INTEGRATIONS,
} from "@/features/integrations/providers";
import { useTranslation } from "@/i18n";
import { useAiStore } from "@/stores/ai";
import { useIntegrationsStore } from "@/stores/integrations";
import type { AiProviderAccount, IntegrationAccount } from "@/types";

function IntegrationCard({
	integration,
	accounts,
}: {
	integration: IntegrationDefinition;
	accounts: IntegrationAccount[];
}) {
	const { t } = useTranslation();
	const IntegrationIcon = integration.icon;
	const count =
		integration.status === "available"
			? accounts.filter((account) => account.provider === integration.id).length
			: 0;

	return (
		<Link
			to={`/integrations/${integration.id}`}
			className="group rounded-3xl border border-transparent border-b-black/5 bg-card p-5 transition-colors hover:bg-accent/40 dark:border-white/5 dark:border-b-white/5"
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex min-w-0 items-start gap-3.5">
					<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted/80 ring-1 ring-inset ring-border/50">
						<IntegrationIcon className="h-5.5 w-5.5" />
					</div>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<span className="font-semibold tracking-tight">
								{integration.name}
							</span>
							{integration.status === "available" ? (
								<Badge variant={count > 0 ? "success" : "secondary"}>
									{count > 0 ? t("integrations.connectedCount", { count }) : t("integrations.notConnected")}
								</Badge>
							) : (
								<Badge variant="outline">{t("integrations.comingNext")}</Badge>
							)}
						</div>
						<p className="mt-1 text-xs leading-5 text-muted-foreground">
							{integration.shortDescription}
						</p>
					</div>
				</div>
				<ChevronRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
			</div>
		</Link>
	);
}

function AiIntegrationCard({
	integration,
	accounts,
}: {
	integration: AiProviderDefinition;
	accounts: AiProviderAccount[];
}) {
	const { t } = useTranslation();
	const IntegrationIcon = integration.icon;
	const count = accounts.filter(
		(account) => account.provider === integration.id,
	).length;
	return (
		<Link
			to={`/integrations/ai/${integration.id}`}
			className="group rounded-3xl border border-transparent border-b-black/5 bg-card p-5 transition-colors hover:bg-accent/40 dark:border-white/5 dark:border-b-white/5"
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex min-w-0 items-start gap-3.5">
					<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted/80 ring-1 ring-inset ring-border/50">
						<IntegrationIcon className="h-5.5 w-5.5" />
					</div>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<span className="font-semibold tracking-tight">
								{integration.name}
							</span>
							<Badge variant={count > 0 ? "success" : "secondary"}>
								{count > 0
										? t("integrations.connectedCount", { count })
										: integration.local
											? t("integrations.freeLocal")
											: t("integrations.available")}
							</Badge>
						</div>
						<p className="mt-1 text-xs leading-5 text-muted-foreground">
							{integration.shortDescription}
						</p>
					</div>
				</div>
				<ChevronRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
			</div>
		</Link>
	);
}

function TabIntro({ text }: { text: string }) {
	return <p className="mb-3 text-sm text-muted-foreground">{text}</p>;
}

export function IntegrationsPage() {
	const { t } = useTranslation();
	const accounts = useIntegrationsStore((state) => state.accounts);
	const hasLoaded = useIntegrationsStore((state) => state.hasLoaded);
	const load = useIntegrationsStore((state) => state.load);
	const aiAccounts = useAiStore((state) => state.accounts);
	const aiHasLoaded = useAiStore((state) => state.hasLoaded);
	const loadAi = useAiStore((state) => state.load);

	useEffect(() => {
		if (!hasLoaded) void load();
	}, [hasLoaded, load]);
	useEffect(() => {
		if (!aiHasLoaded) void loadAi();
	}, [aiHasLoaded, loadAi]);

	return (
		<div>
			<PageHeader
				title={t("integrations.title")}
				description={t("integrations.description")}
			/>

			<Tabs defaultValue="git">
				<TabsList>
					<TabsTrigger value="git">{t("integrations.tabs.git")}</TabsTrigger>
					<TabsTrigger value="ai">{t("integrations.tabs.ai")}</TabsTrigger>
					<TabsTrigger value="storage">{t("integrations.tabs.storage")}</TabsTrigger>
				</TabsList>

				<TabsContent value="git">
					<TabIntro text={t("integrations.introGit")} />
					<div className="grid gap-3 md:grid-cols-2">
						{PROVIDERS.map((integration) => (
							<IntegrationCard
								key={integration.id}
								integration={integration}
								accounts={accounts}
							/>
						))}
					</div>
				</TabsContent>

				<TabsContent value="ai">
					<TabIntro text={t("integrations.introAi")} />
					<div className="grid gap-3 md:grid-cols-2">
						{AI_PROVIDERS.map((integration) => (
							<AiIntegrationCard
								key={integration.id}
								integration={integration}
								accounts={aiAccounts}
							/>
						))}
					</div>
				</TabsContent>

				<TabsContent value="storage">
					<TabIntro text={t("integrations.introStorage")} />
					<div className="grid gap-3 md:grid-cols-2">
						{STORAGE_INTEGRATIONS.map((integration) => (
							<IntegrationCard
								key={integration.id}
								integration={integration}
								accounts={accounts}
							/>
						))}
					</div>
				</TabsContent>
			</Tabs>

			<div className="mt-6 flex items-start gap-3 rounded-2xl bg-muted/30 px-4 py-3.5 text-sm text-muted-foreground">
				<LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
				<p>
					{t("integrations.vaultNote")}
				</p>
			</div>
		</div>
	);
}
