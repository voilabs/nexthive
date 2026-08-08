import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, ShieldCheck } from "lucide-react";

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
import { getProvider } from "@/features/integrations/providers";
import { useIntegrationsStore } from "@/stores/integrations";
import { toAppError } from "@/types/errors";
import type { GitProvider, IntegrationAccount } from "@/types";

type Step = "method" | "token" | "ssh" | "ssh-created";

interface AddAccountDialogProps {
  provider: GitProvider;
  open: boolean;
  onOpenChange(open: boolean): void;
}

export function AddAccountDialog({
  provider,
  open,
  onOpenChange,
}: AddAccountDialogProps) {
  const definition = getProvider(provider);
  const addTokenAccount = useIntegrationsStore((state) => state.addTokenAccount);
  const addSshAccount = useIntegrationsStore((state) => state.addSshAccount);
  const initialStep: Step = definition.supportsSsh ? "method" : "token";

  const [step, setStep] = useState<Step>(initialStep);
  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState(definition.defaultBaseUrl);
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [createdAccount, setCreatedAccount] =
    useState<IntegrationAccount | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(definition.supportsSsh ? "method" : "token");
    setBaseUrl(definition.defaultBaseUrl);
  }, [definition.defaultBaseUrl, definition.supportsSsh, open]);

  const reset = () => {
    setStep(definition.supportsSsh ? "method" : "token");
    setLabel("");
    setBaseUrl(definition.defaultBaseUrl);
    setToken("");
    setSubmitting(false);
    setError(null);
    setWarning(null);
    setCreatedAccount(null);
    setCopied(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleTokenSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await addTokenAccount(
        provider,
        label.trim(),
        provider === "github" ? null : baseUrl.trim(),
        token,
      );
      setToken("");
      if (result.warning) {
        setWarning(result.warning);
        setSubmitting(false);
      } else {
        handleOpenChange(false);
      }
    } catch (cause) {
      setError(toAppError(cause).message);
      setSubmitting(false);
    }
  };

  const handleSshSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const account = await addSshAccount(provider, label.trim());
      setCreatedAccount(account);
      setStep("ssh-created");
    } catch (cause) {
      setError(toAppError(cause).message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyPublicKey = async () => {
    if (!createdAccount?.sshPublicKey) return;
    try {
      await navigator.clipboard.writeText(createdAccount.sshPublicKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Select the public key and copy it manually.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        {step === "method" ? (
          <>
            <DialogHeader>
              <DialogTitle>Connect {definition.name}</DialogTitle>
              <DialogDescription>
                Choose how NextHive authenticates with this account.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <button
                type="button"
                onClick={() => setStep("token")}
                className="flex items-start gap-3 rounded-xl bg-muted/45 p-4 text-left transition-colors hover:bg-muted"
              >
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <span>
                  <span className="block text-sm font-medium">Access token</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    List and create repositories, then push backups. Recommended.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStep("ssh")}
                className="flex items-start gap-3 rounded-xl bg-muted/45 p-4 text-left transition-colors hover:bg-muted"
              >
                <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <span>
                  <span className="block text-sm font-medium">Dedicated SSH key</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    Generate an isolated keypair without touching existing SSH keys.
                  </span>
                </span>
              </button>
            </div>
          </>
        ) : null}

        {step === "token" ? (
          <form onSubmit={handleTokenSubmit}>
            <DialogHeader>
              <DialogTitle>Connect {definition.name}</DialogTitle>
              <DialogDescription>{definition.tokenPermissions}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5">
              <div className="grid gap-2">
                <Label htmlFor={`${provider}-label`}>Account label</Label>
                <Input
                  id={`${provider}-label`}
                  placeholder="Personal, Work, Home server…"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  autoFocus
                />
              </div>
              {provider !== "github" ? (
                <div className="grid gap-2">
                  <Label htmlFor={`${provider}-base-url`}>
                    {definition.baseUrlLabel}
                  </Label>
                  <Input
                    id={`${provider}-base-url`}
                    type="url"
                    placeholder={definition.defaultBaseUrl}
                    value={baseUrl}
                    onChange={(event) => setBaseUrl(event.target.value)}
                    spellCheck={false}
                  />
                </div>
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor={`${provider}-token`}>{definition.tokenName}</Label>
                <Input
                  id={`${provider}-token`}
                  type="password"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Create it under {definition.tokenPath}. The token is validated in
                  Rust and stored only in the operating-system credential vault.
                </p>
              </div>
              {warning ? <p className="text-sm text-warning">{warning}</p> : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <DialogFooter>
              {definition.supportsSsh && !warning ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("method")}
                  disabled={submitting}
                >
                  Back
                </Button>
              ) : null}
              <Button
                type={warning ? "button" : "submit"}
                onClick={warning ? () => handleOpenChange(false) : undefined}
                disabled={
                  warning
                    ? false
                    : submitting ||
                      !label.trim() ||
                      !token.trim() ||
                      (provider !== "github" && !baseUrl.trim())
                }
              >
                {submitting ? <Loader2 className="animate-spin" /> : null}
                {warning ? "Done" : "Validate & connect"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}

        {step === "ssh" ? (
          <form onSubmit={handleSshSubmit}>
            <DialogHeader>
              <DialogTitle>Create a dedicated SSH key</DialogTitle>
              <DialogDescription>
                NextHive generates an RSA-4096 keypair for this account. Existing
                SSH keys are never read or modified.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5">
              <div className="grid gap-2">
                <Label htmlFor="ssh-label">Account label</Label>
                <Input
                  id="ssh-label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  autoFocus
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setStep("method")}>
                Back
              </Button>
              <Button type="submit" disabled={submitting || !label.trim()}>
                {submitting ? <Loader2 className="animate-spin" /> : null}
                Generate key
              </Button>
            </DialogFooter>
          </form>
        ) : null}

        {step === "ssh-created" && createdAccount ? (
          <>
            <DialogHeader>
              <DialogTitle>Add this key to {definition.name}</DialogTitle>
              <DialogDescription>
                Add the public key to your account, then use Test on the account row.
                The private half never leaves this computer.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <textarea
                readOnly
                value={createdAccount.sshPublicKey ?? ""}
                onFocus={(event) => event.currentTarget.select()}
                className="h-28 w-full select-text resize-none rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={copyPublicKey}>
                  {copied ? <Check /> : <Copy />}
                  {copied ? "Copied" : "Copy key"}
                </Button>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
