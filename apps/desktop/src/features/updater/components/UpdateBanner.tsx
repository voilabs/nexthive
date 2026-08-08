import { ArrowDownToLine, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { useUpdaterStore } from "@/stores/updater";

export function UpdateBanner() {
	const { t } = useTranslation();
	const status = useUpdaterStore((state) => state.status);
	const update = useUpdaterStore((state) => state.update);
	const downloadedBytes = useUpdaterStore((state) => state.downloadedBytes);
	const totalBytes = useUpdaterStore((state) => state.totalBytes);
	const install = useUpdaterStore((state) => state.install);

	if (!update || !["available", "downloading", "installing"].includes(status)) {
		return null;
	}

	const progress = totalBytes
		? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
		: null;
	const busy = status === "downloading" || status === "installing";

	return (
		<div className="flex min-h-12 items-center gap-4 border-b border-border/60 bg-card/80 px-6 backdrop-blur-sm">
			<div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
				{busy ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<ArrowDownToLine className="h-4 w-4" />
				)}
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">
					{status === "available"
						? t("updates.availableBanner", { version: update.version })
						: status === "downloading"
							? t("updates.downloadingBanner", {
								version: update.version,
								progress: progress === null ? "" : ` · ${progress}%`,
							})
							: t("updates.installingBanner")}
				</p>
			</div>
			{status === "available" ? (
				<Button size="sm" onClick={() => void install()}>
					{t("updates.updateNow")}
				</Button>
			) : null}
		</div>
	);
}
