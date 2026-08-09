import { useEffect, useState } from "react";
import { ArrowLeft, Cloud, Loader2, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useS3Store } from "@/stores/s3";
import { toAppError } from "@/types/errors";

export function S3IntegrationPage() {
  const { accounts, loaded, load, add, remove } = useS3Store();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", endpoint: "", region: "us-east-1", bucket: "", accessKeyId: "", secretAccessKey: "", pathStyle: false });
  useEffect(() => { if (!loaded) void load(); }, [loaded, load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      await add({ ...form, endpoint: form.endpoint.trim() || null });
      setOpen(false);
      setForm({ label: "", endpoint: "", region: "us-east-1", bucket: "", accessKeyId: "", secretAccessKey: "", pathStyle: false });
    } catch (cause) { setError(toAppError(cause).message); } finally { setBusy(false); }
  };

  return <div>
    <Link to="/integrations" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Integrations</Link>
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="flex gap-3.5"><div className="flex size-11 items-center justify-center rounded-full bg-muted"><Cloud className="size-6" /></div><div><h1 className="text-2xl font-semibold">Amazon S3</h1><p className="mt-1 text-sm text-muted-foreground">AWS S3 and compatible object storage destinations.</p></div></div>
      <Button onClick={() => setOpen(true)}><Plus />Add destination</Button>
    </div>
    <div className="space-y-3">
      {accounts.map((account) => <div key={account.id} className="flex items-center justify-between rounded-3xl bg-card p-5 ring-1 ring-inset ring-border/50"><div><div className="font-semibold">{account.label}</div><div className="mt-1 select-text text-xs text-muted-foreground">s3://{account.bucket} · {account.region}{account.endpoint ? ` · ${account.endpoint}` : ""}</div></div><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => void remove(account.id)}><Trash2 />Remove</Button></div>)}
      {loaded && accounts.length === 0 ? <div className="rounded-3xl bg-muted/30 p-8 text-center text-sm text-muted-foreground">No S3 destination connected yet.</div> : null}
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-xl"><form onSubmit={submit}><DialogHeader><DialogTitle>Connect S3 destination</DialogTitle><DialogDescription>The credentials are tested immediately and stored only in the operating-system vault.</DialogDescription></DialogHeader><div className="grid gap-4 py-5">
      <div className="grid gap-2"><Label>Label</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Production bucket" /></div>
      <div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label>Region</Label><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div><div className="grid gap-2"><Label>Bucket</Label><Input value={form.bucket} onChange={(e) => setForm({ ...form, bucket: e.target.value })} /></div></div>
      <div className="grid gap-2"><Label>Custom endpoint <span className="font-normal text-muted-foreground">optional</span></Label><Input type="url" value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} placeholder="https://s3.example.com" /></div>
      <div className="grid gap-2"><Label>Access key ID</Label><Input value={form.accessKeyId} onChange={(e) => setForm({ ...form, accessKeyId: e.target.value })} autoComplete="off" /></div>
      <div className="grid gap-2"><Label>Secret access key</Label><Input type="password" value={form.secretAccessKey} onChange={(e) => setForm({ ...form, secretAccessKey: e.target.value })} autoComplete="off" /></div>
      <p className="text-xs text-muted-foreground">The credentials need <code>s3:ListBucket</code> for the bucket and <code>s3:PutObject</code> for the selected backup prefix.</p>
      <label className="flex items-center justify-between rounded-xl bg-muted/40 p-3 text-sm"><span><span className="block font-medium">Path-style addressing</span><span className="text-xs text-muted-foreground">Usually required by MinIO and local S3-compatible services.</span></span><Switch checked={form.pathStyle} onCheckedChange={(value) => setForm({ ...form, pathStyle: value })} /></label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div><DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy || !form.label.trim() || !form.region.trim() || !form.bucket.trim() || !form.accessKeyId.trim() || !form.secretAccessKey.trim()}>{busy ? <Loader2 className="animate-spin" /> : null}Test & connect</Button></DialogFooter></form></DialogContent></Dialog>
  </div>;
}
