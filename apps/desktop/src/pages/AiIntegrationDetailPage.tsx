import {
	ArrowLeft,
	CheckCircle2,
	KeyRound,
	Loader2,
	LockKeyhole,
	Plus,
	TestTube2,
	Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
	getAiProvider,
	isAiProvider,
} from "@/features/integrations/aiProviders";
import { cn } from "@/lib/utils";
import { useAiStore } from "@/stores/ai";
import type { AiConnectionTestResult, AiProviderAccount } from "@/types";
import { toAppError } from "@/types/errors";

function AiAccountRow({ account }: { account: AiProviderAccount }) {
	const definition = getAiProvider(account.provider);
	const ProviderIcon = definition.icon;
	const test = useAiStore((state) => state.test);
	const remove = useAiStore((state) => state.remove);
	const [testing, setTesting] = useState(false);
	const [result, setResult] = useState<AiConnectionTestResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [removing, setRemoving] = useState(false);

	const handleTest = async () => {
		setTesting(true);
		setResult(null);
		setError(null);
		try {
			setResult(await test(account.id));
		} catch (cause) {
			setError(toAppError(cause).message);
		} finally {
			setTesting(false);
		}
	};

	const handleRemove = async () => {
		setRemoving(true);
		setError(null);
		try {
			await remove(account.id);
		} catch (cause) {
			setError(toAppError(cause).message);
			setRemoving(false);
			setConfirmDelete(false);
		}
	};

	return (
		<div className="rounded-xl bg-muted/35 p-4 ring-1 ring-inset ring-border/45">
			<div className="flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/80">
					<ProviderIcon className="h-4.5 w-4.5 text-muted-foreground" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="truncate text-sm font-medium">
							{account.label}
						</span>
						<Badge variant="secondary">{account.model}</Badge>
					</div>
					<p className="truncate text-sm text-muted-foreground">
						{account.baseUrl}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-1.5">
					<Button
						variant="outline"
						size="sm"
						onClick={handleTest}
						disabled={testing}
					>
						{testing ? <Loader2 className="animate-spin" /> : <TestTube2 />}
						Test
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="text-muted-foreground hover:text-destructive"
						onClick={() => setConfirmDelete(true)}
						aria-label="Remove AI connection"
					>
						<Trash2 />
					</Button>
				</div>
			</div>
			{result ? (
				<div
					className={cn(
						"mt-3 rounded-xl px-3 py-2 text-sm",
						result.success
							? "bg-success/10 text-success"
							: "bg-destructive/10 text-destructive",
					)}
				>
					<p>{result.message}</p>
					{result.sample ? (
						<code className="mt-1.5 block whitespace-pre-wrap text-xs text-foreground/75">
							{result.sample}
						</code>
					) : null}
				</div>
			) : null}
			{error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

			<Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remove “{account.label}”?</DialogTitle>
						<DialogDescription>
							The stored API key will be removed from the operating-system
							vault. Profiles using this connection will fall back to normal
							commit messages.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setConfirmDelete(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleRemove}
							disabled={removing}
						>
							{removing ? <Loader2 className="animate-spin" /> : <Trash2 />}
							Remove
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export function AiIntegrationDetailPage() {
	const { provider } = useParams();
	const accounts = useAiStore((state) => state.accounts);
	const hasLoaded = useAiStore((state) => state.hasLoaded);
	const isLoading = useAiStore((state) => state.isLoading);
	const loadError = useAiStore((state) => state.error);
	const load = useAiStore((state) => state.load);
	const add = useAiStore((state) => state.add);
	const [addOpen, setAddOpen] = useState(false);
	const [label, setLabel] = useState("");
	const [baseUrl, setBaseUrl] = useState("");
	const [model, setModel] = useState("");
	const apiKeyRef = useRef<HTMLInputElement>(null);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	useEffect(() => {
		if (!hasLoaded) void load();
	}, [hasLoaded, load]);

	if (!isAiProvider(provider)) {
		return <Navigate to="/integrations" replace />;
	}
	const definition = getAiProvider(provider);
	const ProviderIcon = definition.icon;
	const providerAccounts = accounts.filter(
		(account) => account.provider === provider,
	);

	const openAdd = () => {
		setLabel(`${definition.name} commit messages`);
		setBaseUrl(definition.defaultBaseUrl);
		setModel(definition.defaultModel);
		setFormError(null);
		setAddOpen(true);
	};

	const handleAdd = async () => {
		setSaving(true);
		setFormError(null);
		try {
			await add({
				provider,
				label: label.trim(),
				baseUrl: baseUrl.trim(),
				model: model.trim(),
				apiKey: apiKeyRef.current?.value.trim() || null,
			});
			if (apiKeyRef.current) apiKeyRef.current.value = "";
			setAddOpen(false);
		} catch (cause) {
			setFormError(toAppError(cause).message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div>
			<div className="mb-6">
				<Link
					to="/integrations"
					className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Integrations
				</Link>
				<div className="flex items-start justify-between gap-4">
					<div className="flex items-center gap-3.5">
						<div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted/80 ring-1 ring-inset ring-border/50">
							<ProviderIcon className="h-6 w-6" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-2xl font-semibold tracking-tight">
									{definition.name}
								</h1>
								<Badge variant="success">Available</Badge>
								{definition.local ? (
									<Badge variant="secondary">Local</Badge>
								) : null}
							</div>
							<p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
								{definition.detailDescription}
							</p>
						</div>
					</div>
					<Button onClick={openAdd}>
						<Plus /> Add connection
					</Button>
				</div>
			</div>

			<div className="mb-4 flex items-start gap-3 rounded-xl bg-muted/30 px-4 py-3.5 text-sm text-muted-foreground">
				<LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
				<p>
					NextHive sends change counts and at most 60 repository-relative path
					names. File contents and absolute local paths are never sent. API keys
					remain in the operating-system vault.
				</p>
			</div>

			{isLoading && !hasLoaded ? (
				<div className="flex justify-center py-10">
					<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			) : loadError ? (
				<p className="text-sm text-destructive">{loadError.message}</p>
			) : providerAccounts.length === 0 ? (
				<EmptyState
					icon={ProviderIcon}
					title={`No ${definition.name} connection`}
					description="Add and test a model connection, then select it from a backup profile's Settings tab."
					action={
						<Button onClick={openAdd}>
							<Plus /> Add connection
						</Button>
					}
				/>
			) : (
				<div className="space-y-3">
					{providerAccounts.map((account) => (
						<AiAccountRow key={account.id} account={account} />
					))}
				</div>
			)}

			<Dialog open={addOpen} onOpenChange={setAddOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Connect {definition.name}</DialogTitle>
						<DialogDescription>
							NextHive sends a tiny test request before saving the connection. A
							cloud provider may count it toward usage.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-1">
						<div className="grid gap-2">
							<Label htmlFor="ai-label">Connection name</Label>
							<Input
								id="ai-label"
								value={label}
								onChange={(event) => setLabel(event.target.value)}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="ai-base-url">API base URL</Label>
							<Input
								id="ai-base-url"
								value={baseUrl}
								onChange={(event) => setBaseUrl(event.target.value)}
								spellCheck={false}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="ai-model">Model</Label>
							<Input
								id="ai-model"
								value={model}
								onChange={(event) => setModel(event.target.value)}
								spellCheck={false}
							/>
							<p className="text-xs text-muted-foreground">
								{definition.modelHint}
							</p>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="ai-api-key">
								API key {definition.requiresApiKey ? "" : "(optional)"}
							</Label>
							<div className="relative">
								<KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									ref={apiKeyRef}
									id="ai-api-key"
									type="password"
									className="pl-9"
									autoComplete="off"
									placeholder={
										definition.requiresApiKey
											? "Required"
											: "Leave empty for local servers"
									}
								/>
							</div>
						</div>
						{formError ? (
							<p className="text-sm text-destructive">{formError}</p>
						) : null}
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setAddOpen(false)}
							disabled={saving}
						>
							Cancel
						</Button>
						<Button
							onClick={handleAdd}
							disabled={
								saving || !label.trim() || !model.trim() || !baseUrl.trim()
							}
						>
							{saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
							{saving ? "Testing connection…" : "Test & save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
