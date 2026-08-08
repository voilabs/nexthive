import { Outlet } from "react-router";

import { Sidebar } from "@/components/layout/Sidebar";
import { TitleBar } from "@/components/layout/TitleBar";
import { UpdateBanner } from "@/features/updater/components/UpdateBanner";

export function AppShell() {
	return (
		<div className="app-surface flex h-full flex-col overflow-hidden bg-secondary">
			<TitleBar />
			<UpdateBanner />
			<div className="flex min-h-0 flex-1 bg-secondary">
				<Sidebar />
				<main className="min-w-0 flex-1 overflow-y-auto bg-background rounded-tl-3xl">
					{/* Railed content column, mirroring the website's grid frame. */}
					<div className="relative mx-auto min-h-full w-full max-w-4xl px-12 2xl:px-0 py-12">
						<Outlet />
					</div>
				</main>
			</div>
		</div>
	);
}
