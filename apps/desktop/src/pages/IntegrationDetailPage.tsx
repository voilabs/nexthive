import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FolderTree,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { AccountRow } from "@/features/integrations/components/AccountRow";
import { AddAccountDialog } from "@/features/integrations/components/AddAccountDialog";
import {
  getIntegration,
  getProvider,
  isGitProvider,
  isIntegrationId,
  type PlannedIntegrationDefinition,
} from "@/features/integrations/providers";
import { useIntegrationsStore } from "@/stores/integrations";

function PlannedIntegration({
  definition,
}: {
  definition: PlannedIntegrationDefinition;
}) {
  const IntegrationIcon = definition.icon;

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
              <IntegrationIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {definition.name}
                </h1>
                <Badge variant="outline">Coming next</Badge>
              </div>
              <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
                {definition.detailDescription}
              </p>
            </div>
          </div>
          <Button disabled>
            <Clock3 />
            Not available yet
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-3xl border border-transparent border-b-black/5 bg-card p-5 dark:border-white/5 dark:border-b-white/5">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="font-semibold tracking-tight">
                {definition.connectionLabel}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {definition.connectionDescription}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-transparent border-b-black/5 bg-card p-5 dark:border-white/5 dark:border-b-white/5">
          <div className="flex items-start gap-3">
            <FolderTree className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="font-semibold tracking-tight">Destination layout</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                The selected folder's contents will be written into a dated
                destination. The source folder itself is never modified.
              </p>
              <code className="mt-3 block rounded-lg bg-muted/60 px-3 py-2 text-xs text-foreground">
                {definition.destinationLayout}
              </code>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-3 rounded-xl bg-muted/30 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-semibold tracking-tight">Required safeguards</h2>
            <div className="mt-3 space-y-2.5">
              {definition.safeguards.map((safeguard) => (
                <div
                  key={safeguard}
                  className="flex items-start gap-2.5 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{safeguard}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <p className="mt-4 text-sm text-muted-foreground">
        This page documents the real connection design. NextHive will not show a
        connected state or successful backup until authentication, transfer,
        verification and retry handling are complete.
      </p>
    </div>
  );
}

export function IntegrationDetailPage() {
  const { provider } = useParams();
  const accounts = useIntegrationsStore((state) => state.accounts);
  const isLoading = useIntegrationsStore((state) => state.isLoading);
  const hasLoaded = useIntegrationsStore((state) => state.hasLoaded);
  const error = useIntegrationsStore((state) => state.error);
  const load = useIntegrationsStore((state) => state.load);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (!hasLoaded) void load();
  }, [hasLoaded, load]);

  if (!isIntegrationId(provider)) {
    return <Navigate to="/integrations" replace />;
  }

  const integration = getIntegration(provider);
  if (integration.status === "coming-next") {
    return <PlannedIntegration definition={integration} />;
  }

  if (!isGitProvider(provider)) {
    return <Navigate to="/integrations" replace />;
  }

  const definition = getProvider(provider);
  const ProviderIcon = definition.icon;
  const providerAccounts = accounts.filter(
    (account) => account.provider === provider,
  );

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
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {definition.name}
                </h1>
                <Badge variant="success">Available</Badge>
              </div>
              <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
                {definition.detailDescription}
              </p>
            </div>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus />
            Add account
          </Button>
        </div>
      </div>

      {isLoading && !hasLoaded ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-xl bg-destructive/5 p-4 text-sm text-destructive ring-1 ring-inset ring-destructive/20">
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
      ) : providerAccounts.length === 0 ? (
        <EmptyState
          icon={ProviderIcon}
          title={`No ${definition.name} account connected`}
          description="Connect a token-based account to list or create private repositories and deliver backups."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus />
              Connect {definition.name}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {providerAccounts.map((account) => (
            <AccountRow key={account.id} account={account} />
          ))}
        </div>
      )}

      <AddAccountDialog
        provider={provider}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </div>
  );
}
