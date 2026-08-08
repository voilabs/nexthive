import { useEffect, useState } from "react";
import { Check, GitBranch, Loader2, Server, Sparkles, Unlink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { integrationsApi } from "@/features/integrations/api";
import { getProvider } from "@/features/integrations/providers";
import { previewRepositoryName } from "@/features/profiles/repositoryNaming";
import { useTranslation } from "@/i18n";
import { useIntegrationsStore } from "@/stores/integrations";
import { useProfilesStore } from "@/stores/profiles";
import { toAppError } from "@/types/errors";
import type { BackupProfile, RepositorySummary } from "@/types";

const NO_ACCOUNT = "none";

export function RepositoryTab({ profile }: { profile: BackupProfile }) {
  const { t } = useTranslation();
  const updateProfile = useProfilesStore((s) => s.update);
  const createRepository = useProfilesStore((s) => s.createRepository);
  const accounts = useIntegrationsStore((s) => s.accounts);

  const [repos, setRepos] = useState<RepositorySummary[] | null>(null);
  const [reposLoading, setReposLoading] = useState(false);
  const [busy, setBusy] = useState<"link" | "create" | "select" | "branch" | null>(
    null,
  );
  const [branchDraft, setBranchDraft] = useState(profile.branch);
  const [error, setError] = useState<string | null>(null);

  const linkedAccount =
    accounts.find((a) => a.id === profile.integrationAccountId) ?? null;
  const hasRepo = Boolean(profile.repositoryOwner && profile.repositoryName);

  useEffect(() => {
    setBranchDraft(profile.branch);
  }, [profile.branch]);

  // Load the repository list whenever a token account is linked.
  useEffect(() => {
    if (linkedAccount?.authMethod !== "pat") {
      setRepos(null);
      return;
    }
    let cancelled = false;
    setReposLoading(true);
    integrationsApi
      .listRepositories(linkedAccount.id)
      .then((result) => {
        if (!cancelled) setRepos(result);
      })
      .catch((e) => {
        if (!cancelled) setError(toAppError(e).message);
      })
      .finally(() => {
        if (!cancelled) setReposLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [linkedAccount?.id, linkedAccount?.authMethod]);

  const run = async (kind: typeof busy, action: () => Promise<unknown>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setBusy(null);
    }
  };

  const handleAccountChange = (value: string) =>
    run("link", () =>
      updateProfile(profile.id, {
        integrationAccountId: value === NO_ACCOUNT ? null : Number(value),
        repositoryOwner: null,
        repositoryName: null,
        repositoryUrl: null,
      }),
    );

  const handleSelectRepo = (fullName: string) => {
    const repo = repos?.find((r) => r.fullName === fullName);
    if (!repo) return;
    void run("select", () =>
      updateProfile(profile.id, {
        repositoryOwner: repo.owner,
        repositoryName: repo.name,
        repositoryUrl: repo.htmlUrl,
        branch: repo.defaultBranch ?? undefined,
      }),
    );
  };

  const handleDisconnect = () =>
    run("select", () =>
      updateProfile(profile.id, {
        repositoryOwner: null,
        repositoryName: null,
        repositoryUrl: null,
      }),
    );

  const handleSaveBranch = () => {
    if (branchDraft.trim() === profile.branch) return;
    void run("branch", () =>
      updateProfile(profile.id, { branch: branchDraft.trim() }),
    );
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="grid gap-2">
        <Label className="flex items-center gap-1.5">
          <Server className="h-3.5 w-3.5" />
          {t("profileRepository.account")}
        </Label>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("profileRepository.connectFirst")}
          </p>
        ) : (
          <Select
            value={
              profile.integrationAccountId !== null
                ? String(profile.integrationAccountId)
                : NO_ACCOUNT
            }
            onValueChange={handleAccountChange}
            disabled={busy !== null}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ACCOUNT}>{t("profileRepository.noAccount")}</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={String(account.id)}>
                  {getProvider(account.provider).name} · {account.label}
                  {account.username ? ` (${account.username})` : ""}
                  {account.authMethod === "ssh" ? " · SSH" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Separator />

      <div className="grid gap-3">
        <Label>{t("profileRepository.repository")}</Label>
        {hasRepo ? (
          <div className="flex items-center justify-between rounded-xl bg-muted/35 p-3 ring-1 ring-inset ring-border/45">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {profile.repositoryOwner}/{profile.repositoryName}
              </div>
              <div className="select-text truncate text-xs text-muted-foreground">
                {profile.repositoryUrl ?? ""}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={handleDisconnect}
              disabled={busy !== null}
            >
              <Unlink />
              {t("profileRepository.disconnect")}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("profileRepository.none")}
          </p>
        )}

        {linkedAccount?.authMethod === "pat" ? (
          <div className="grid gap-2">
            {!hasRepo ? (
              <div className="grid justify-items-start gap-1.5">
                <Button
                  onClick={() =>
                    void run("create", () => createRepository(profile.id))
                  }
                  disabled={busy !== null}
                >
                  {busy === "create" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Sparkles />
                  )}
                  {t("profileRepository.createAuto")}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t("profileRepository.createsPrivate")}{" "}
                  <span className="font-mono text-foreground">
                    {previewRepositoryName(profile.name)}
                  </span>
                </p>
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <span className="text-xs text-muted-foreground">
                {hasRepo ? t("profileRepository.switch") : t("profileRepository.useExisting")}
              </span>
              {reposLoading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("profileRepository.loadingRepos")}
                </p>
              ) : repos && repos.length > 0 ? (
                <Select
                  value=""
                  onValueChange={handleSelectRepo}
                  disabled={busy !== null}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("profileRepository.choose")} />
                  </SelectTrigger>
                  <SelectContent>
                    {repos.map((repo) => (
                      <SelectItem key={repo.fullName} value={repo.fullName}>
                        {repo.fullName}
                        {repo.private ? ` · ${t("profileRepository.privateBadge")}` : ` · ${t("profileRepository.publicBadge")}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : repos ? (
                <p className="text-sm text-muted-foreground">
                  {t("profileRepository.empty")}
                </p>
              ) : null}
            </div>
          </div>
        ) : linkedAccount ? (
          <p className="text-sm text-muted-foreground">
            {t("profileRepository.sshNote")}
          </p>
        ) : null}
      </div>

      <Separator />

      <div className="grid max-w-xs gap-2">
        <Label htmlFor="branch" className="flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5" />
          {t("profileRepository.branch")}
        </Label>
        <div className="flex gap-2">
          <Input
            id="branch"
            value={branchDraft}
            onChange={(e) => setBranchDraft(e.target.value)}
          />
          <Button
            variant="outline"
            onClick={handleSaveBranch}
            disabled={busy !== null || branchDraft.trim() === profile.branch}
          >
            {busy === "branch" ? <Loader2 className="animate-spin" /> : <Check />}
            {t("common.save")}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
