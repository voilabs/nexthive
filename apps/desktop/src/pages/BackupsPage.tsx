import { Archive, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { CreateProfileDialog } from "@/features/profiles/components/CreateProfileDialog";
import { ProfileCard } from "@/features/profiles/components/ProfileCard";
import { useTranslation } from "@/i18n";
import { useIntegrationsStore } from "@/stores/integrations";
import { useProfilesStore } from "@/stores/profiles";
import { SettingsPanel } from "./SettingsPage";

export function BackupsPage() {
	const { t } = useTranslation();
	const { profiles, isLoading, hasLoaded, error, load } = useProfilesStore();
	const integrationsLoaded = useIntegrationsStore((s) => s.hasLoaded);
	const loadIntegrations = useIntegrationsStore((s) => s.load);
	const [createOpen, setCreateOpen] = useState(false);

	useEffect(() => {
		if (!hasLoaded) void load();
	}, [hasLoaded, load]);

	// Profile cards offer an account picker, so accounts load alongside.
	useEffect(() => {
		if (!integrationsLoaded) void loadIntegrations();
	}, [integrationsLoaded, loadIntegrations]);

	return (
		<div>
			<PageHeader
				title={t("backups.title")}
				description={t("backups.description")}
				actions={
					<Button onClick={() => setCreateOpen(true)}>
						<Plus />
						{t("backups.newProfile")}
					</Button>
				}
			/>

			{isLoading && !hasLoaded ? (
				<div className="flex justify-center py-16">
					<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			) : error ? (
				<div className="rounded-2xl bg-destructive/5 p-4 text-sm text-destructive">
					{error.message}
					<Button
						variant="outline"
						size="sm"
						className="ml-3"
						onClick={() => void load()}
					>
						Retry
					</Button>
				</div>
			) : profiles.length === 0 ? (
				<EmptyState
					icon={Archive}
					title={t("backups.emptyTitle")}
					description={t("backups.emptyDescription")}
					action={
						<Button onClick={() => setCreateOpen(true)}>
							<Plus />
							{t("backups.createProfile")}
						</Button>
					}
				/>
			) : (
				<SettingsPanel>
					{profiles.map((profile) => (
						<ProfileCard key={profile.id} profile={profile} />
					))}
				</SettingsPanel>
			)}

			<CreateProfileDialog open={createOpen} onOpenChange={setCreateOpen} />
		</div>
	);
}
