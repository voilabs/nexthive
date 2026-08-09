import { Cloud, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { PageHeader } from "@/components/layout/PageHeader";
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
import { useS3Store } from "@/stores/s3";
import type { AiProviderAccount, IntegrationAccount } from "@/types";

interface GenericIntegrationCardProps {
	to: string;
	icon: React.ElementType;
	imageId: string;
	name: string;
	description: string;
	buttonText: string;
	isInstalled: boolean;
	isComingNext?: boolean;
}

function IntegrationListItem({
	to,
	icon: Icon,
	imageId,
	name,
	description,
	buttonText,
	isInstalled = false,
	isComingNext = false,
}: GenericIntegrationCardProps) {
	const [imageError, setImageError] = useState(false);

	const content = (
		<>
			<div className="flex items-center gap-4 min-w-0">
				<div className={`flex size-[42px] shrink-0 items-center justify-center rounded-[10px] overflow-hidden ${isComingNext ? 'opacity-50 grayscale' : ''}`}>
					{!imageError ? (
						<img
							src={`/integrations/${imageId}.png`}
							alt={name}
							className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
							onError={() => setImageError(true)}
						/>
					) : (
						<Icon className="size-5 text-foreground/80 transition-transform duration-300 group-hover:scale-110" />
					)}
				</div>
				<div className="min-w-0">
					<h3 className={`truncate text-[14px] font-semibold ${isComingNext ? 'text-foreground/50' : 'text-foreground/90'}`}>
						{name}
					</h3>
					<p className={`truncate text-[13px] ${isComingNext ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
						{description}
					</p>
				</div>
			</div>
			<div className="ml-4 shrink-0">
				<span className={`inline-flex h-[28px] items-center justify-center rounded-full border px-3.5 text-[12px] font-medium transition-colors ${isComingNext
					? 'border-border/40 bg-transparent text-muted-foreground/50 border-dashed'
					: isInstalled
						? 'border-border/60 bg-transparent text-foreground/70 group-hover:bg-accent group-hover:text-foreground'
						: 'bg-foreground text-background'
					}`}>
					{buttonText}
				</span>
			</div>
		</>
	);

	if (isComingNext) {
		return (
			<div className="flex items-center justify-between rounded-xl px-3 py-3 -mx-3 select-none">
				{content}
			</div>
		);
	}

	return (
		<Link
			to={to}
			className="group flex items-center justify-between rounded-xl px-3 py-3 -mx-3 transition-colors hover:bg-accent/40"
		>
			{content}
		</Link>
	);
}

function IntegrationCard({
	integration,
	accounts,
}: {
	integration: IntegrationDefinition;
	accounts: IntegrationAccount[];
}) {
	const { t } = useTranslation();
	const count =
		integration.status === "available"
			? accounts.filter((account) => account.provider === integration.id).length
			: 0;

	const isComingNext = integration.status !== "available";

	return (
		<IntegrationListItem
			to={`/integrations/${integration.id}`}
			icon={integration.icon}
			imageId={integration.id}
			name={integration.name}
			description={integration.shortDescription}
			isComingNext={isComingNext}
			isInstalled={count > 0}
			buttonText={
				!isComingNext
					? count > 0
						? t("integrations.manage") || "Yönet"
						: t("integrations.configure") || "Kur"
					: t("integrations.comingNext") || "Yakında"
			}
		/>
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
	const count = accounts.filter(
		(account) => account.provider === integration.id,
	).length;

	return (
		<IntegrationListItem
			to={`/integrations/ai/${integration.id}`}
			icon={integration.icon}
			imageId={integration.id}
			name={integration.name}
			description={integration.shortDescription}
			isComingNext={false}
			isInstalled={count > 0}
			buttonText={
				count > 0
					? t("integrations.manage") || "Yönet"
					: t("integrations.configure") || "Kur"
			}
		/>
	);
}

export function IntegrationsPage() {
	const { t } = useTranslation();

	const accounts = useIntegrationsStore((state) => state.accounts);
	const hasLoaded = useIntegrationsStore((state) => state.hasLoaded);
	const load = useIntegrationsStore((state) => state.load);

	const aiAccounts = useAiStore((state) => state.accounts);
	const aiHasLoaded = useAiStore((state) => state.hasLoaded);
	const loadAi = useAiStore((state) => state.load);

	const s3Accounts = useS3Store((state) => state.accounts);
	const s3Loaded = useS3Store((state) => state.loaded);
	const loadS3 = useS3Store((state) => state.load);

	useEffect(() => {
		if (!hasLoaded) void load();
	}, [hasLoaded, load]);
	useEffect(() => {
		if (!aiHasLoaded) void loadAi();
	}, [aiHasLoaded, loadAi]);
	useEffect(() => {
		if (!s3Loaded) void loadS3();
	}, [s3Loaded, loadS3]);

	return (
		<div className="pb-12 max-w-4xl mx-auto">
			<PageHeader
				title={t("integrations.title")}
				description={t("integrations.description")}
			/>

			<div className="mt-6 flex items-start sm:items-center gap-2.5 text-[13px] text-muted-foreground/70">
				<LockKeyhole className="size-4 shrink-0 mt-0.5 sm:mt-0" />
				<p>
					{t("integrations.vaultNote")}
				</p>
			</div>

			<div className="flex flex-col gap-10 mt-8">
				{/* Git Integrations */}
				<section>
					<h2 className="text-[15px] font-semibold text-foreground/90 pb-3 border-b border-border/40">
						{t("integrations.tabs.git")}
					</h2>
					<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
						{PROVIDERS.map((integration) => (
							<IntegrationCard
								key={integration.id}
								integration={integration}
								accounts={accounts}
							/>
						))}
					</div>
				</section>

				{/* AI Integrations */}
				<section>
					<h2 className="text-[15px] font-semibold text-foreground/90 pb-3 border-b border-border/40">
						{t("integrations.tabs.ai")}
					</h2>
					<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
						{AI_PROVIDERS.map((integration) => (
							<AiIntegrationCard
								key={integration.id}
								integration={integration}
								accounts={aiAccounts}
							/>
						))}
					</div>
				</section>

				{/* Storage Integrations */}
				<section>
					<h2 className="text-[15px] font-semibold text-foreground/90 pb-3 border-b border-border/40">
						{t("integrations.tabs.storage")}
					</h2>
					<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
						<IntegrationListItem
							to="/integrations/s3"
							icon={Cloud}
							imageId="s3"
							name="Amazon S3"
							description="AWS S3 and compatible object storage"
							isComingNext={false}
							isInstalled={s3Accounts.length > 0}
							buttonText={
								s3Accounts.length > 0
									? t("integrations.manage") || "Yönet"
									: t("integrations.configure") || "Kur"
							}
						/>
						{STORAGE_INTEGRATIONS.map((integration) => (
							<IntegrationCard
								key={integration.id}
								integration={integration}
								accounts={accounts}
							/>
						))}
					</div>
				</section>
			</div>
		</div>
	);
}
