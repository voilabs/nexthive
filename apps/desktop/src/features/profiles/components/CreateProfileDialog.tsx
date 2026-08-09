import { useEffect, useMemo, useState } from "react";
import { Loader2, Lock, Sparkles } from "lucide-react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { integrationsApi } from "@/features/integrations/api";
import { useTranslation } from "@/i18n";
import { getProvider } from "@/features/integrations/providers";
import { previewRepositoryName } from "@/features/profiles/repositoryNaming";
import { useIntegrationsStore } from "@/stores/integrations";
import { useProfilesStore } from "@/stores/profiles";
import { useS3Store } from "@/stores/s3";
import { cn } from "@/lib/utils";
import { toAppError } from "@/types/errors";
import type { CreateBackupProfileInput, RepositorySummary } from "@/types";

const NO_ACCOUNT = "none";

type RepoMode = "auto" | "existing";

interface CreateProfileDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
}

export function CreateProfileDialog({
  open,
  onOpenChange,
}: CreateProfileDialogProps) {
  const { t } = useTranslation();
  const createProfile = useProfilesStore((s) => s.create);
  const createRepository = useProfilesStore((s) => s.createRepository);
  const accounts = useIntegrationsStore((s) => s.accounts);
  const s3Accounts = useS3Store((s) => s.accounts);
  const s3Loaded = useS3Store((s) => s.loaded);
  const loadS3 = useS3Store((s) => s.load);

  const [name, setName] = useState("");
  const [targetType, setTargetType] = useState<"git" | "s3">("git");
  const [s3AccountValue, setS3AccountValue] = useState("");
  const [s3Prefix, setS3Prefix] = useState("nexthive");
  const [branch, setBranch] = useState("");
  const [accountValue, setAccountValue] = useState(NO_ACCOUNT);
  const [repoMode, setRepoMode] = useState<RepoMode>("auto");
  const [repos, setRepos] = useState<RepositorySummary[] | null>(null);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [manualOwner, setManualOwner] = useState("");
  const [manualRepo, setManualRepo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<"form" | "creating-repo">("form");
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = useMemo(
    () =>
      accountValue === NO_ACCOUNT
        ? null
        : (accounts.find((a) => a.id === Number(accountValue)) ?? null),
    [accountValue, accounts],
  );
  const isPat = selectedAccount?.authMethod === "pat";
  const isSsh = selectedAccount?.authMethod === "ssh";
  const integrationValue = targetType === "s3"
    ? (s3AccountValue ? `s3:${s3AccountValue}` : NO_ACCOUNT)
    : (accountValue !== NO_ACCOUNT ? `git:${accountValue}` : NO_ACCOUNT);

  const selectIntegration = (value: string) => {
    if (value.startsWith("s3:")) {
      setTargetType("s3");
      setS3AccountValue(value.slice(3));
      setAccountValue(NO_ACCOUNT);
      return;
    }
    setTargetType("git");
    setAccountValue(value.startsWith("git:") ? value.slice(4) : NO_ACCOUNT);
    setS3AccountValue("");
  };

  const reset = () => {
    setName("");
    setTargetType("git");
    setS3AccountValue("");
    setS3Prefix("nexthive");
    setBranch("");
    setAccountValue(NO_ACCOUNT);
    setRepoMode("auto");
    setRepos(null);
    setReposLoading(false);
    setReposError(null);
    setSelectedRepo("");
    setManualOwner("");
    setManualRepo("");
    setSubmitting(false);
    setStage("form");
    setError(null);
  };

  useEffect(() => { if (open && !s3Loaded) void loadS3(); }, [open, s3Loaded, loadS3]);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  // Load the account's repositories whenever a token account is picked.
  useEffect(() => {
    if (!open || !isPat || !selectedAccount) {
      setRepos(null);
      setSelectedRepo("");
      return;
    }
    let cancelled = false;
    setReposLoading(true);
    setReposError(null);
    integrationsApi
      .listRepositories(selectedAccount.id)
      .then((result) => {
        if (cancelled) return;
        setRepos(result);
        setReposLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setReposError(toAppError(e).message);
        setReposLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedAccount?.id, isPat]);

  const handleRepoPick = (fullName: string) => {
    setSelectedRepo(fullName);
    const repo = repos?.find((r) => r.fullName === fullName);
    if (repo?.defaultBranch && !branch.trim()) {
      setBranch(repo.defaultBranch);
    }
  };

  const canSubmit =
    !submitting &&
    name.trim().length > 0 &&
    integrationValue !== NO_ACCOUNT &&
    (targetType !== "s3" || s3AccountValue !== "") &&
    (targetType !== "git" || !isPat || repoMode === "auto" || selectedRepo !== "");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const input: CreateBackupProfileInput = {
      name: name.trim(),
      targetType,
      branch: branch.trim() || null,
      integrationAccountId: targetType === "git" ? selectedAccount?.id ?? null : null,
      s3AccountId: targetType === "s3" ? Number(s3AccountValue) : null,
      s3Prefix: targetType === "s3" ? s3Prefix.trim() || "nexthive" : null,
    };
    if (isPat && repoMode === "existing") {
      const repo = repos?.find((r) => r.fullName === selectedRepo);
      if (repo) {
        input.repositoryOwner = repo.owner;
        input.repositoryName = repo.name;
        input.repositoryUrl = repo.htmlUrl;
        input.branch = branch.trim() || repo.defaultBranch || null;
      }
    } else if (isSsh && manualOwner.trim() && manualRepo.trim()) {
      input.repositoryOwner = manualOwner.trim();
      input.repositoryName = manualRepo.trim();
    }

    try {
      const profile = await createProfile(input);
      if (targetType === "git" && isPat && repoMode === "auto") {
        setStage("creating-repo");
        try {
          await createRepository(profile.id);
        } catch (e) {
          // Profile exists; repo creation can be retried from its card.
          setError(
            t("createProfile.repoFailed", { message: toAppError(e).message }),
          );
          setStage("form");
          setSubmitting(false);
          return;
        }
      }
      handleOpenChange(false);
    } catch (e) {
      setError(toAppError(e).message);
      setStage("form");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("createProfile.title")}</DialogTitle>
            <DialogDescription>
              {t("createProfile.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-5">
            <div className="grid gap-2">
              <Label htmlFor="profile-name">{t("createProfile.nameLabel")}</Label>
              <Input
                id="profile-name"
                placeholder={t("createProfile.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label>{t("profileRepository.account")}</Label>
              <Select value={integrationValue} onValueChange={selectIntegration}>
                <SelectTrigger><SelectValue placeholder="Choose an integration" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ACCOUNT}>Choose an integration</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={`git:${account.id}`} value={`git:${account.id}`}>
                      {getProvider(account.provider).name} · {account.label}
                      {account.username ? ` (${account.username})` : ""}
                      {account.authMethod === "ssh" ? " · SSH" : ""}
                    </SelectItem>
                  ))}
                  {s3Accounts.map((account) => (
                    <SelectItem key={`s3:${account.id}`} value={`s3:${account.id}`}>
                      S3 · {account.label} · {account.bucket}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {accounts.length === 0 && s3Accounts.length === 0 ? <p className="text-sm text-muted-foreground">Connect a Git or S3 destination under Integrations first.</p> : null}
            </div>

            {targetType === "git" ? <>
            {isPat ? (
              <div className="grid gap-2">
                <Label>{t("profileRepository.repository")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRepoMode("auto")}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                      repoMode === "auto"
                        ? "border-ring bg-accent/60"
                        : "hover:bg-accent/40",
                    )}
                  >
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span>
                      <span className="block text-sm font-medium">
                        {t("createProfile.createAuto")}
                      </span>
                      <span className="mt-0.5 block break-all font-mono text-[11px] text-muted-foreground">
                        {previewRepositoryName(name)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepoMode("existing")}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                      repoMode === "existing"
                        ? "border-ring bg-accent/60"
                        : "hover:bg-accent/40",
                    )}
                  >
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span>
                      <span className="block text-sm font-medium">
                        {t("createProfile.useExisting")}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {t("createProfile.pickOne")}
                      </span>
                    </span>
                  </button>
                </div>

                {repoMode === "auto" ? (
                  <p className="text-xs text-muted-foreground">
                    {t("createProfile.autoNote", { owner: selectedAccount?.username ?? t("createProfile.theAccount") })}
                  </p>
                ) : reposLoading ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("profileRepository.loadingRepos")}
                  </p>
                ) : reposError ? (
                  <p className="text-sm text-destructive">{reposError}</p>
                ) : repos && repos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("createProfile.emptySwitch")}
                  </p>
                ) : repos ? (
                  <Select value={selectedRepo} onValueChange={handleRepoPick}>
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
                ) : null}
                {repoMode === "existing" &&
                repos?.find((r) => r.fullName === selectedRepo)?.private ===
                  false ? (
                  <p className="text-xs text-warning">
                    {t("createProfile.publicWarning")}
                  </p>
                ) : null}
              </div>
            ) : null}

            {isSsh ? (
              <div className="grid gap-2">
                <Label>
                  {t("profileRepository.repository")}{" "}
                  <span className="font-normal text-muted-foreground">
                    {t("createProfile.sshOptional")}
                  </span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder={t("createProfile.ownerPlaceholder")}
                    value={manualOwner}
                    onChange={(e) => setManualOwner(e.target.value)}
                  />
                  <Input
                    placeholder={t("createProfile.repoPlaceholder")}
                    value={manualRepo}
                    onChange={(e) => setManualRepo(e.target.value)}
                  />
                </div>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="profile-branch">
                {t("profileRepository.branch")}{" "}
                <span className="font-normal text-muted-foreground">
                  {t("createProfile.branchOptional")}
                </span>
              </Label>
              <Input
                id="profile-branch"
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </div>
            </> : <>
              <div className="grid gap-2"><Label htmlFor="s3-prefix">Object prefix</Label><Input id="s3-prefix" value={s3Prefix} onChange={(e) => setS3Prefix(e.target.value)} placeholder="nexthive" /><p className="text-xs text-muted-foreground">Snapshots are stored below this folder-like prefix.</p></div>
            </>}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? <Loader2 className="animate-spin" /> : null}
              {stage === "creating-repo"
                ? t("createProfile.creatingRepo")
                : t("exclusions.createProfile")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
