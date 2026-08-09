import { useEffect, useState } from "react";
import { Check, Cloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfilesStore } from "@/stores/profiles";
import { useS3Store } from "@/stores/s3";
import { toAppError } from "@/types/errors";
import type { BackupProfile } from "@/types";

export function S3DestinationTab({ profile }: { profile: BackupProfile }) {
  const { accounts, loaded, load } = useS3Store();
  const update = useProfilesStore((s) => s.update);
  const [account, setAccount] = useState(profile.s3AccountId ? String(profile.s3AccountId) : "");
  const [prefix, setPrefix] = useState(profile.s3Prefix ?? "nexthive");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!loaded) void load(); }, [loaded, load]);
  const save = async () => { setBusy(true); setError(null); try { await update(profile.id, { s3AccountId: Number(account), s3Prefix: prefix.trim() || "nexthive" }); } catch (e) { setError(toAppError(e).message); } finally { setBusy(false); } };
  return <div className="max-w-xl space-y-5"><div className="grid gap-2"><Label className="flex items-center gap-1.5"><Cloud className="size-3.5" />S3 destination</Label><Select value={account} onValueChange={setAccount}><SelectTrigger><SelectValue placeholder="Choose a destination" /></SelectTrigger><SelectContent>{accounts.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.label} · s3://{item.bucket}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="profile-s3-prefix">Object prefix</Label><Input id="profile-s3-prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} /><p className="text-xs text-muted-foreground">Layout: {prefix || "nexthive"}/profile-{profile.id}/YYYY-MM-DD/source-ID/…</p></div><Button onClick={() => void save()} disabled={busy || !account}>{busy ? <Loader2 className="animate-spin" /> : <Check />}Save destination</Button>{error ? <p className="text-sm text-destructive">{error}</p> : null}</div>;
}
