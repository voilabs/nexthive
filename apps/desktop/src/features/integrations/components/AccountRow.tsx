import { useState } from "react";
import { Check, Copy, KeyRound, Loader2, PlugZap, Trash2 } from "lucide-react";

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
import { getProvider } from "@/features/integrations/providers";
import { cn } from "@/lib/utils";
import { useIntegrationsStore } from "@/stores/integrations";
import { toAppError } from "@/types/errors";
import type { ConnectionTestResult, IntegrationAccount } from "@/types";

export function AccountRow({ account }: { account: IntegrationAccount }) {
  const definition = getProvider(account.provider);
  const ProviderIcon = definition.icon;
  const testConnection = useIntegrationsStore((state) => state.testConnection);
  const removeAccount = useIntegrationsStore((state) => state.removeAccount);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      setTestResult(await testConnection(account.id));
    } catch (cause) {
      setError(toAppError(cause).message);
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await removeAccount(account.id);
    } catch (cause) {
      setError(toAppError(cause).message);
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  const copyKey = async () => {
    if (!account.sshPublicKey) return;
    try {
      await navigator.clipboard.writeText(account.sshPublicKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Select the public key and copy it manually.");
    }
  };

  return (
    <div className="rounded-xl bg-muted/35 p-4 ring-1 ring-inset ring-border/45">
      <div className="flex items-center gap-3">
        {account.provider === "github" && account.avatarUrl ? (
          <img src={account.avatarUrl} alt="" className="h-10 w-10 rounded-xl" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/80">
            <ProviderIcon className="h-4.5 w-4.5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{account.label}</span>
            <Badge variant="secondary">
              {account.authMethod === "pat" ? "Token" : "SSH"}
            </Badge>
          </div>
          <div className="truncate text-sm text-muted-foreground">
            {account.username ?? "Identity appears after a successful test"}
            {account.provider !== "github" ? ` · ${account.baseUrl}` : ""}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="animate-spin" /> : <PlugZap />}
            Test
          </Button>
          {account.authMethod === "ssh" ? (
            <Button variant="outline" size="sm" onClick={() => setShowKey(true)}>
              <KeyRound />
              Key
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            aria-label="Remove account"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      {testResult ? (
        <p className={cn("mt-3 text-sm", testResult.success ? "text-success" : "text-destructive")}>
          {testResult.message}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <Dialog open={showKey} onOpenChange={setShowKey}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Public key — {account.label}</DialogTitle>
            <DialogDescription>
              Add this key to {definition.name}. The private half never leaves this computer.
            </DialogDescription>
          </DialogHeader>
          <textarea
            readOnly
            value={account.sshPublicKey ?? ""}
            onFocus={(event) => event.currentTarget.select()}
            className="h-28 w-full select-text resize-none rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={copyKey}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy key"}
            </Button>
            <Button type="button" onClick={() => setShowKey(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove “{account.label}”?</DialogTitle>
            <DialogDescription>
              {account.authMethod === "pat"
                ? "The token is deleted from the operating-system credential vault. Linked backup profiles are unlinked but not deleted."
                : `The SSH keypair is deleted locally. Remove its public key from ${definition.name} too.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              Remove account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
