import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";

import { AppShell } from "@/components/layout/AppShell";
import { ContextMenu } from "@/components/ContextMenu";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { useAppUpdates } from "@/hooks/useAppUpdates";
import { useBackupEvents } from "@/hooks/useBackupEvents";
import { useTheme } from "@/hooks/useTheme";
import { useLocalization } from "@/i18n";
import { ActivityPage } from "@/pages/ActivityPage";
import { AutomaticProfilesPage } from "@/pages/AutomaticProfilesPage";
import { BackupsPage } from "@/pages/BackupsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ExcludeProfileDetailPage } from "@/pages/ExcludeProfileDetailPage";
import { ExcludeProfilesPage } from "@/pages/ExcludeProfilesPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { IntegrationsPage } from "@/pages/IntegrationsPage";
import { ProfileDetailPage } from "@/pages/ProfileDetailPage";

const AiIntegrationDetailPage = lazy(() =>
	import("@/pages/AiIntegrationDetailPage").then((module) => ({
		default: module.AiIntegrationDetailPage,
	})),
);
const IntegrationDetailPage = lazy(() =>
	import("@/pages/IntegrationDetailPage").then((module) => ({
		default: module.IntegrationDetailPage,
	})),
);
const ChangelogPage = lazy(() =>
	import("@/pages/ChangelogPage").then((module) => ({
		default: module.ChangelogPage,
	})),
);
const SettingsPage = lazy(() =>
	import("@/pages/SettingsPage").then((module) => ({
		default: module.SettingsPage,
	})),
);

function AppRoutes() {
	useBackupEvents();
	useAppNavigation();
	useTheme();
	useLocalization();
	useAppUpdates();

	return (
		<Suspense
			fallback={
				<div className="py-12 text-center text-sm text-muted-foreground">
					Loading view…
				</div>
			}
		>
			<Routes>
				<Route element={<AppShell />}>
					<Route index element={<DashboardPage />} />
					<Route path="backups" element={<BackupsPage />} />
					<Route path="automatic-profiles" element={<AutomaticProfilesPage />} />
					<Route path="backups/:profileId" element={<ProfileDetailPage />} />
					<Route path="history" element={<HistoryPage />} />
					<Route path="activity" element={<ActivityPage />} />
					<Route path="exclusions" element={<ExcludeProfilesPage />} />
					<Route
						path="exclusions/:excludeProfileId"
						element={<ExcludeProfileDetailPage />}
					/>
					<Route path="integrations" element={<IntegrationsPage />} />
					<Route
						path="integrations/ai/:provider"
						element={<AiIntegrationDetailPage />}
					/>
					<Route
						path="integrations/:provider"
						element={<IntegrationDetailPage />}
					/>
					<Route path="settings" element={<SettingsPage />} />
					<Route path="changelog" element={<ChangelogPage />} />
				</Route>
			</Routes>
		</Suspense>
	);
}

export default function App() {
	return (
		<ContextMenu>
			<BrowserRouter>
				<AppRoutes />
			</BrowserRouter>
		</ContextMenu>
	);
}
