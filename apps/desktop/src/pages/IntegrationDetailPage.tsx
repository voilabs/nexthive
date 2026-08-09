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
import { useTranslation } from "@/i18n";

function IntegrationHeaderIcon({ icon: Icon, imageId, name, isComingNext }: { icon: React.ElementType; imageId: string; name: string; isComingNext?: boolean }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className={`flex size-[52px] shrink-0 items-center justify-center rounded-[14px] bg-muted/40 overflow-hidden ${isComingNext ? 'opacity-50 grayscale' : ''}`}>
      {!imageError ? (
        <img
          src={`/integrations/${imageId}.png`}
          alt={name}
          className="w-full h-full object-contain"
          onError={() => setImageError(true)}
        />
      ) : (
        <Icon className="size-6 text-foreground/80" />
      )}
    </div>
  );
}

function PlannedIntegration({
  definition,
}: {
  definition: PlannedIntegrationDefinition;
}) {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-10">
        <Link
          to="/integrations"
          className="mb-6 inline-flex items-center gap-2 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("integrations.detail.back")}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <IntegrationHeaderIcon icon={definition.icon} imageId={definition.id} name={definition.name} isComingNext={true} />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground/50">
                  {definition.name}
                </h1>
                <Badge variant="outline" className="text-muted-foreground/60 border-dashed px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider">{t("integrations.detail.comingNext")}</Badge>
              </div>
              <p className="mt-1.5 text-[14px] text-muted-foreground/60">
                {definition.detailDescription}
              </p>
            </div>
          </div>
          <Button disabled variant="outline" className="shrink-0 border-dashed bg-transparent text-muted-foreground/50 rounded-full px-5">
            <Clock3 className="mr-2 size-4" />
            {t("integrations.detail.notAvailableYet")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 opacity-60 grayscale select-none">
        <section className="rounded-2xl border border-border/50 bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-muted/50 p-2.5 border border-border/40">
              <KeyRound className="size-5 text-foreground/70" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground/90 tracking-tight">
                {definition.connectionLabel}
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {definition.connectionDescription}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/50 bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-muted/50 p-2.5 border border-border/40">
              <FolderTree className="size-5 text-foreground/70" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground/90 tracking-tight">{t("integrations.detail.destinationLayout")}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {t("integrations.detail.destinationLayoutDesc")}
              </p>
              <code className="mt-4 block rounded-lg border border-border/30 bg-muted/30 px-3 py-2 text-xs font-mono text-muted-foreground">
                {definition.destinationLayout}
              </code>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-border/50 bg-muted/20 p-6 opacity-60 grayscale select-none">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-muted/50 p-2.5 border border-border/40">
            <ShieldCheck className="size-5 text-foreground/70" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground/90 tracking-tight">{t("integrations.detail.safeguards")}</h2>
            <div className="mt-4 space-y-3">
              {definition.safeguards.map((safeguard) => (
                <div
                  key={safeguard}
                  className="flex items-start gap-3 text-[13px] text-muted-foreground"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success/70" />
                  <span className="leading-relaxed">{safeguard}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-10 flex gap-3 text-[13px] text-muted-foreground/60 px-2">
        <ShieldCheck className="size-4 shrink-0" />
        <p className="leading-relaxed">
          {t("integrations.detail.disclaimer")}
        </p>
      </div>
    </div>
  );
}

export function IntegrationDetailPage() {
  const { provider } = useParams();
  const { t } = useTranslation();
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
  const providerAccounts = accounts.filter(
    (account) => account.provider === provider,
  );

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-10">
        <Link
          to="/integrations"
          className="mb-6 inline-flex items-center gap-2 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("integrations.detail.back")}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <IntegrationHeaderIcon icon={definition.icon} imageId={definition.id} name={definition.name} />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {definition.name}
                </h1>
                <Badge variant="success" className="px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase">
                  {t("integrations.detail.available")}
                </Badge>
              </div>
              <p className="mt-1.5 text-[14px] text-muted-foreground">
                {definition.detailDescription}
              </p>
            </div>
          </div>
          <Button onClick={() => setAddOpen(true)} className="shrink-0 rounded-full h-9 px-5 font-medium shadow-sm bg-foreground text-background hover:bg-foreground/90">
            <Plus className="mr-2 size-4" />
            {t("integrations.detail.addAccount")}
          </Button>
        </div>
      </div>

      {isLoading && !hasLoaded ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground/50" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-between rounded-2xl bg-destructive/5 p-5 text-sm text-destructive ring-1 ring-inset ring-destructive/20">
          <span className="font-medium">{error.message}</span>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full border-destructive/20 hover:bg-destructive/10"
            onClick={() => void load()}
          >
            {t("integrations.detail.retry")}
          </Button>
        </div>
      ) : providerAccounts.length === 0 ? (
        <EmptyState
          icon={definition.icon}
          title={t("integrations.detail.noAccountTitle", { name: definition.name })}
          description={t("integrations.detail.noAccountDesc")}
          action={
            <Button onClick={() => setAddOpen(true)} className="rounded-full shadow-sm mt-2">
              <Plus className="mr-2 size-4" />
              {t("integrations.detail.connectAccount", { name: definition.name })}
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
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
