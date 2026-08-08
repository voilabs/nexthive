import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  FileX,
  FolderX,
  Loader2,
  Plus,
  Save,
  ShieldOff,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { translate, useTranslation } from "@/i18n";
import { useExcludesStore } from "@/stores/excludes";
import { toAppError } from "@/types/errors";

type RuleType = "file" | "extension" | "folder" | "relative" | "glob";

const PRESETS = ["*.log", "*.tmp", "*.bak", ".env", "coverage", ".idea", ".vscode"];

function toPattern(type: RuleType, raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if ((type === "file" || type === "folder") && /[\\/]/.test(value)) {
    throw new Error(translate("excludeDetail.nameOnlyError"));
  }
  if (type === "extension") {
    const extension = value.replace(/^\*\./, "").replace(/^\./, "");
    return extension ? `*.${extension}` : "";
  }
  if (type === "relative") {
    return value.replaceAll("\\", "/").replace(/^\/+/, "");
  }
  return value;
}

function ruleExplanation(pattern: string, kind: "glob" | "exact"): string {
  if (kind === "exact") {
    return translate("excludeDetail.explainExact");
  }
  if (pattern.startsWith("*.") && !pattern.slice(2).includes("/")) {
    return translate("excludeDetail.explainExtension", { extension: pattern.slice(1) });
  }
  if (!/[?*\[\]]/.test(pattern) && !pattern.includes("/")) {
    return translate("excludeDetail.explainName", { name: pattern });
  }
  if (pattern.includes("/") && !pattern.startsWith("**/")) {
    return translate("excludeDetail.explainRelative");
  }
  return translate("excludeDetail.explainGlob");
}

export function ExcludeProfileDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ excludeProfileId: string }>();
  const id = Number(params.excludeProfileId);
  const navigate = useNavigate();
  const profiles = useExcludesStore((s) => s.profiles);
  const hasLoaded = useExcludesStore((s) => s.hasLoaded);
  const load = useExcludesStore((s) => s.load);
  const update = useExcludesStore((s) => s.update);
  const remove = useExcludesStore((s) => s.remove);
  const addRule = useExcludesStore((s) => s.addRule);
  const setRuleEnabled = useExcludesStore((s) => s.setRuleEnabled);
  const removeRule = useExcludesStore((s) => s.removeRule);
  const profile = profiles.find((item) => item.id === id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ruleType, setRuleType] = useState<RuleType>("file");
  const [ruleValue, setRuleValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyRule, setBusyRule] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasLoaded) void load();
  }, [hasLoaded, load]);
  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setDescription(profile.description ?? "");
    }
  }, [profile?.id]);

  const preview = useMemo(() => {
    try {
      return toPattern(ruleType, ruleValue);
    } catch {
      return "";
    }
  }, [ruleType, ruleValue]);

  if (!hasLoaded) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div>;
  }
  if (!profile) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">{t("excludeDetail.missing")}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/exclusions"><ArrowLeft />{t("excludeDetail.back")}</Link>
        </Button>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await update(profile.id, name.trim(), description.trim());
    } catch (cause) {
      setError(toAppError(cause).message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddRule = async (raw = ruleValue) => {
    setSaving(true);
    setError(null);
    try {
      const pattern = raw === ruleValue ? toPattern(ruleType, raw) : raw;
      await addRule(profile.id, pattern);
      setRuleValue("");
    } catch (cause) {
      setError(toAppError(cause).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    const message = profile.usedBy > 0
      ? t("excludeDetail.deleteUsed", { count: profile.usedBy })
      : t("excludeDetail.deleteConfirm");
    if (!window.confirm(message)) return;
    try {
      await remove(profile.id);
      navigate("/exclusions");
    } catch (cause) {
      setError(toAppError(cause).message);
    }
  };

  return (
    <div>
      <Link
        to="/exclusions"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("excludeDetail.backShort")}
      </Link>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{profile.name}</h1>
            <Badge variant="outline">{t("excludeDetail.usedBy", { count: profile.usedBy })}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("excludeDetail.description")}
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => void handleDeleteProfile()}>
          <Trash2 />{t("excludeDetail.deleteProfile")}
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("excludeDetail.profileDetails")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="exclude-detail-name">{t("excludeDetail.name")}</Label>
                <Input id="exclude-detail-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="exclude-detail-description">{t("excludeDetail.descriptionLabel")}</Label>
                <Input id="exclude-detail-description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div><Button onClick={() => void handleSave()} disabled={saving || !name.trim()}><Save />{t("excludeDetail.saveDetails")}</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("excludeDetail.addRule")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto]">
                <Select value={ruleType} onValueChange={(value) => setRuleType(value as RuleType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="file">{t("excludeDetail.rule.file")}</SelectItem>
                    <SelectItem value="extension">{t("excludeDetail.rule.extension")}</SelectItem>
                    <SelectItem value="folder">{t("excludeDetail.rule.folder")}</SelectItem>
                    <SelectItem value="relative">{t("excludeDetail.rule.relative")}</SelectItem>
                    <SelectItem value="glob">{t("excludeDetail.rule.glob")}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={ruleValue}
                  onChange={(event) => setRuleValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && ruleValue.trim()) void handleAddRule();
                  }}
                  placeholder={
                    ruleType === "extension" ? "log" :
                    ruleType === "relative" ? "private/secrets.json" :
                    ruleType === "glob" ? "**/generated/*.map" :
                    ruleType === "folder" ? "vendor" : "secrets.txt"
                  }
                />
                <Button onClick={() => void handleAddRule()} disabled={saving || !ruleValue.trim()}>
                  {saving ? <Loader2 className="animate-spin" /> : <Plus />}Add
                </Button>
              </div>
              {preview ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("excludeDetail.savedPattern")} <code className="select-text rounded bg-muted px-1.5 py-0.5">{preview}</code>
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("excludeDetail.quickRules")}</span>
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => void handleAddRule(preset)}
                    className="rounded-md border px-2 py-1 font-mono text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("excludeDetail.rules")}</CardTitle>
                <Badge variant="secondary">{t("excludeDetail.active", { count: profile.rules.filter((rule) => rule.enabled).length })}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {profile.rules.length === 0 ? (
                <div className="py-8 text-center">
                  <ShieldOff className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                  <p className="text-sm font-medium">{t("excludeDetail.noRules")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("excludeDetail.noRulesDescription")}</p>
                </div>
              ) : (
                <ul className="divide-y">
                  {profile.rules.map((rule) => (
                    <li key={rule.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      {rule.pattern.includes("/") ? <FolderX className="h-4 w-4 text-muted-foreground" /> : <FileX className="h-4 w-4 text-muted-foreground" />}
                      <div className="min-w-0 flex-1">
                        <code className="select-text block truncate text-sm" title={rule.pattern}>{rule.pattern}</code>
                        <div className="mt-1 flex items-center gap-2">
                          {rule.kind === "exact" ? (
                            <Badge variant="outline" className="text-[10px]">{t("excludeDetail.exactPath")}</Badge>
                          ) : null}
                          <p className="text-xs text-muted-foreground">{ruleExplanation(rule.pattern, rule.kind)}</p>
                        </div>
                      </div>
                      <Switch
                        checked={rule.enabled}
                        disabled={busyRule === rule.id}
                        onCheckedChange={async (enabled) => {
                          setBusyRule(rule.id);
                          try { await setRuleEnabled(rule.id, enabled); }
                          catch (cause) { setError(toAppError(cause).message); }
                          finally { setBusyRule(null); }
                        }}
                        aria-label={t("excludeDetail.toggleRule", { pattern: rule.pattern })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busyRule === rule.id}
                        onClick={async () => {
                          setBusyRule(rule.id);
                          try { await removeRule(rule.id); }
                          catch (cause) { setError(toAppError(cause).message); }
                          finally { setBusyRule(null); }
                        }}
                        aria-label={t("excludeDetail.deleteRule", { pattern: rule.pattern })}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">{t("excludeDetail.howRulesWork")}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <p><code className="text-foreground">secrets.txt</code> blocks any file or folder with that name, at any depth.</p>
              <p><code className="text-foreground">*.log</code> blocks every log file in the source.</p>
              <p><code className="text-foreground">cache</code> prunes every folder named cache before scanning its contents.</p>
              <p><code className="text-foreground">private/data.json</code> is anchored to the source folder root.</p>
              <p><code className="text-foreground">**/generated/**</code> provides advanced any-depth matching.</p>
            </CardContent>
          </Card>
          <div className="rounded-xl border border-warning/25 bg-warning/5 p-4 text-xs leading-relaxed text-muted-foreground">
            {t("excludeDetail.warning")}
          </div>
        </aside>
      </div>
    </div>
  );
}


