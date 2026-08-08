import {
	Activity,
	Archive,
	BookOpenText,
	FolderCog,
	History,
	LayoutDashboard,
	ListFilter,
	Plug,
	Settings,
} from "lucide-react";
import { NavLink } from "react-router";

import { useAppInfo } from "@/hooks/useAppInfo";
import { type TranslationKey, useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
	{
		label: "nav.library",
		items: [
			{ to: "/", label: "nav.dashboard", icon: LayoutDashboard, end: true },
			{ to: "/backups", label: "nav.backups", icon: Archive },
			{
				to: "/automatic-profiles",
				label: "nav.automaticProfiles",
				icon: FolderCog,
			},
			{ to: "/history", label: "nav.history", icon: History },
			{ to: "/activity", label: "nav.activity", icon: Activity },
		],
	},
	{
		label: "nav.manage",
		items: [
			{ to: "/exclusions", label: "nav.exclusions", icon: ListFilter },
			{ to: "/integrations", label: "nav.integrations", icon: Plug },
			{ to: "/settings", label: "nav.settings", icon: Settings },
		],
	},
] as const satisfies ReadonlyArray<{
	label: TranslationKey;
	items: ReadonlyArray<{
		to: string;
		label: TranslationKey;
		icon: typeof Activity;
		end?: boolean;
	}>;
}>;

export function Sidebar() {
	const { info } = useAppInfo();
	const { t } = useTranslation();
	const changelogTarget = info
		? `/changelog#version-${info.version}`
		: "/changelog";

	return (
		<aside className="flex w-[236px] shrink-0 flex-col bg-secondary">
			<nav className="flex-1 space-y-7 px-3 py-5">
				{NAV_GROUPS.map((group) => (
					<div key={group.label}>
						<div className="px-3 pb-2 font-grotesk text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/65">
							{t(group.label)}
						</div>
						<div className="space-y-1">
							{group.items.map(({ to, label, icon: Icon, ...rest }) => (
								<NavLink
									key={to}
									to={to}
									end={"end" in rest ? rest.end : false}
									className={({ isActive }) =>
										cn(
											"group relative flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-colors rounded-full",
											isActive
												? "bg-primary/10 text-foreground"
												: "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
										)
									}
								>
									<Icon className="h-4 w-4 transition-colors group-hover:text-foreground" />
									{t(label)}
								</NavLink>
							))}
						</div>
					</div>
				))}
			</nav>

			<div className="border-t border-border/70 p-3">
				<NavLink
					to={changelogTarget}
					className={({ isActive }) =>
						cn(
							"group flex items-center gap-3 px-3 py-2.5 transition-colors rounded-full",
							isActive
								? "bg-primary/10 text-foreground"
								: "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
						)
					}
				>
					<BookOpenText className="h-4 w-4 shrink-0" />
					<span className="min-w-0 flex-1">
						<span className="block text-[12px] font-medium">
							{t("nav.whatsNew")}
						</span>
					</span>
					<span className="border border-border bg-foreground/[0.04] px-1.5 py-0.5 rounded-full font-mono text-[9px] text-muted-foreground">
						{info ? `v${info.version}` : "—"}
					</span>
				</NavLink>
			</div>
		</aside>
	);
}
