import { FileText } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { changelogSource } from "@/features/changelog/source";
import { useAppInfo } from "@/hooks/useAppInfo";
import { useTranslation } from "@/i18n";

export function ChangelogPage() {
	const { info } = useAppInfo();
	const { t } = useTranslation();
	const { hash } = useLocation();

	useEffect(() => {
		if (!hash) return;
		requestAnimationFrame(() => {
			document
				.getElementById(hash.slice(1))
				?.scrollIntoView({ block: "start" });
		});
	}, [hash]);

	return (
		<div>
			<PageHeader
				title="CHANGELOG.md"
				description={t("changelog.description")}
				actions={
					info ? (
						<Badge variant="secondary">
							{t("changelog.installed", { version: info.version })}
						</Badge>
					) : null
				}
			/>

			<Card className="overflow-hidden">
				<div className="flex h-10 items-center gap-2 border-b border-border/70 bg-muted/35 px-4 text-[11px] text-muted-foreground">
					<FileText className="h-3.5 w-3.5" />
					<span className="font-mono">CHANGELOG.md</span>
					<span className="ml-auto">{t("changelog.preview")}</span>
				</div>
				<MarkdownPreview
					content={changelogSource}
					className="mx-auto max-w-4xl px-9 py-8"
				/>
			</Card>
		</div>
	);
}
