import { ArrowRight, FilterX, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n";
import { useExcludesStore } from "@/stores/excludes";
import { toAppError } from "@/types/errors";

export function ExcludeProfilesPage() {
	const { t } = useTranslation();
	const profiles = useExcludesStore((s) => s.profiles);
	const isLoading = useExcludesStore((s) => s.isLoading);
	const hasLoaded = useExcludesStore((s) => s.hasLoaded);
	const storeError = useExcludesStore((s) => s.error);
	const load = useExcludesStore((s) => s.load);
	const create = useExcludesStore((s) => s.create);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!hasLoaded) void load();
	}, [hasLoaded, load]);

	const handleCreate = async (event: React.FormEvent) => {
		event.preventDefault();
		setSaving(true);
		setError(null);
		try {
			await create(name.trim(), description.trim() || undefined);
			setDialogOpen(false);
			setName("");
			setDescription("");
		} catch (cause) {
			setError(toAppError(cause).message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div>
			<PageHeader
				title={t("exclusions.title")}
				description={t("exclusions.description")}
				actions={
					<Button onClick={() => setDialogOpen(true)}>
						<Plus />
						{t("exclusions.newProfile")}
					</Button>
				}
			/>

			{isLoading && !hasLoaded ? (
				<div className="flex justify-center py-16">
					<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			) : storeError && profiles.length === 0 ? (
				<div className="rounded-2xl bg-destructive/5 px-5 py-4">
					<p className="text-sm text-destructive">{storeError.message}</p>
					<Button
						className="mt-3"
						variant="outline"
						onClick={() => void load()}
					>
						{t("exclusions.tryAgain")}
					</Button>
				</div>
			) : profiles.length === 0 ? (
				<EmptyState
					icon={FilterX}
					title={t("exclusions.emptyTitle")}
					description={t("exclusions.emptyDescription")}
					action={
						<Button onClick={() => setDialogOpen(true)}>
							<Plus />
							{t("exclusions.create")}
						</Button>
					}
				/>
			) : (
				<div className="grid gap-4 xl:grid-cols-2">
					{profiles.map((profile) => {
						const activeRules = profile.rules.filter((rule) => rule.enabled);
						return (
							<Card
								key={profile.id}
								className="group transition-colors hover:bg-accent/40"
							>
								<CardHeader>
									<div className="flex items-start justify-between gap-3">
										<div>
											<CardTitle className="text-base">
												{profile.name}
											</CardTitle>
											<CardDescription className="mt-1 line-clamp-2 min-h-10">
												{profile.description || t("exclusions.noDescription")}
											</CardDescription>
										</div>
										<FilterX className="h-5 w-5 text-muted-foreground" />
									</div>
								</CardHeader>
								<CardContent>
									<div className="mb-4 flex gap-2">
										<Badge variant="secondary">
											{t(activeRules.length === 1 ? "exclusions.activeRule" : "exclusions.activeRules", { count: activeRules.length })}
										</Badge>
										<Badge variant="outline">
											{t(profile.usedBy === 1 ? "exclusions.usedByOne" : "exclusions.usedByMany", { count: profile.usedBy })}
										</Badge>
									</div>
									{activeRules.length > 0 ? (
										<div className="mb-4 flex flex-wrap gap-1.5">
											{activeRules.slice(0, 5).map((rule) => (
												<code
													key={rule.id}
													className="rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground"
												>
													{rule.pattern}
												</code>
											))}
											{activeRules.length > 5 ? (
												<span className="px-1 py-1 text-xs text-muted-foreground">
													+{activeRules.length - 5} more
												</span>
											) : null}
										</div>
									) : (
										<p className="mb-4 text-sm text-muted-foreground">
											{t("exclusions.nothing")}
										</p>
									)}
									<Button variant="outline" className="w-full" asChild>
										<Link to={`/exclusions/${profile.id}`}>
											{t("exclusions.manageRules")}
											<ArrowRight />
										</Link>
									</Button>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<form onSubmit={handleCreate}>
						<DialogHeader>
							<DialogTitle>{t("exclusions.dialogTitle")}</DialogTitle>
							<DialogDescription>
								{t("exclusions.dialogDescription")}
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4 py-5">
							<div className="grid gap-2">
								<Label htmlFor="exclude-name">{t("exclusions.nameLabel")}</Label>
								<Input
									id="exclude-name"
									value={name}
									onChange={(event) => setName(event.target.value)}
									placeholder={t("exclusions.namePlaceholder")}
									autoFocus
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="exclude-description">{t("exclusions.descriptionLabel")}</Label>
								<Input
									id="exclude-description"
									value={description}
									onChange={(event) => setDescription(event.target.value)}
									placeholder={t("exclusions.descriptionPlaceholder")}
								/>
							</div>
							{error ? (
								<p className="text-sm text-destructive">{error}</p>
							) : null}
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="ghost"
								onClick={() => setDialogOpen(false)}
								disabled={saving}
							>
								{t("common.cancel")}
							</Button>
							<Button type="submit" disabled={saving || !name.trim()}>
								{saving ? <Loader2 className="animate-spin" /> : null}
								{t("exclusions.createProfile")}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}


