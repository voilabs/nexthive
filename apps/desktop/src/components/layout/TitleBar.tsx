import { Minus, Square, X } from "lucide-react";
import type { PointerEvent } from "react";
import { useLocation } from "react-router";

import { BrandMark } from "@/components/BrandMark";
import { windowApi } from "@/features/window/api";
import { type TranslationKey, useTranslation } from "@/i18n";

export function TitleBar() {
	const { pathname } = useLocation();
	const { t } = useTranslation();
	const sectionTitle = pathname.startsWith("/backups")
		? "nav.backups"
		: pathname.startsWith("/history")
			? "nav.history"
			: pathname.startsWith("/activity")
				? "nav.activity"
				: pathname.startsWith("/exclusions")
					? "nav.exclusions"
					: pathname.startsWith("/integrations")
						? "nav.integrations"
						: pathname.startsWith("/settings")
							? "nav.settings"
							: pathname.startsWith("/changelog")
								? "nav.whatsNew"
								: "nav.dashboard";

	const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
		if (event.button !== 0 || event.detail > 1) return;
		const target = event.target as HTMLElement;
		if (target.closest("[data-window-control]")) return;
		void windowApi.startDragging();
	};

	return (
		<header
			role="toolbar"
			aria-label={t("window.toolbar")}
			data-tauri-drag-region
			onPointerDown={handlePointerDown}
			onDoubleClick={() => void windowApi.toggleMaximize()}
			className="group/titlebar relative z-50 flex h-11 shrink-0 items-center bg-secondary"
		>
			<div
				data-tauri-drag-region
				className="flex min-w-0 flex-1 items-center gap-2.5 px-6"
			>
				<BrandMark className="h-5 w-5" />
				<span
					data-tauri-drag-region
					className="inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-[-0.01em] text-foreground/85"
				>
					NextHive
					<span aria-hidden="true" className="h-1 w-1 rounded-full bg-brand" />
				</span>
			</div>

			<div
				data-tauri-drag-region
				className="pointer-events-none absolute inset-0 flex items-center justify-center"
			>
				<span className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
					{t(sectionTitle as TranslationKey)}
				</span>
			</div>

			<fieldset
				aria-label={t("window.controls")}
				className="relative z-10 flex h-full items-stretch"
				onDoubleClick={(event) => event.stopPropagation()}
			>
				<button
					data-window-control
					type="button"
					onClick={() => void windowApi.minimize()}
					className="grid h-full w-[46px] place-items-center text-foreground/70 transition-colors hover:bg-foreground/[0.07] hover:text-foreground"
					aria-label={t("window.minimize")}
				>
					<Minus className="h-3.5 w-3.5" strokeWidth={1.6} />
				</button>
				<button
					data-window-control
					type="button"
					onClick={() => void windowApi.toggleMaximize()}
					className="grid h-full w-[46px] place-items-center text-foreground/70 transition-colors hover:bg-foreground/[0.07] hover:text-foreground"
					aria-label={t("window.maximize")}
				>
					<Square className="h-2.5 w-2.5" strokeWidth={1.6} />
				</button>
				<button
					data-window-control
					type="button"
					onClick={() => void windowApi.close()}
					className="grid h-full w-[46px] place-items-center text-foreground/70 transition-colors hover:bg-[#e81123] hover:text-white"
					aria-label={t("window.close")}
				>
					<X className="h-3.5 w-3.5" strokeWidth={1.6} />
				</button>
			</fieldset>
		</header>
	);
}
