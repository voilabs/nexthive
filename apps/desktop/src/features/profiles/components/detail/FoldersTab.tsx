import { useEffect, useState } from "react";

import { useTranslation } from "@/i18n";import { open as openFolderDialog } from "@tauri-apps/plugin-dialog";
import { Folder, FolderPlus, Loader2, ShieldOff, X } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExcludesStore } from "@/stores/excludes";
import { useProfilesStore } from "@/stores/profiles";
import { toAppError } from "@/types/errors";
import type { BackupProfile, BackupSource } from "@/types";

const NO_SOURCES: BackupSource[] = [];

export function FoldersTab({ profile }: { profile: BackupProfile }) {
  const { t } = useTranslation();
  const addSource = useProfilesStore((s) => s.addSource);
  const removeSource = useProfilesStore((s) => s.removeSource);
  const setSourceExcludeProfile = useProfilesStore(
    (s) => s.setSourceExcludeProfile,
  );
  const sources = useProfilesStore(
    (s) => s.sourcesByProfile[profile.id] ?? NO_SOURCES,
  );
  const excludeProfiles = useExcludesStore((s) => s.profiles);
  const excludesLoaded = useExcludesStore((s) => s.hasLoaded);
  const loadExcludes = useExcludesStore((s) => s.load);

  const [pendingPaths, setPendingPaths] = useState<string[]>([]);
  const [selectedExclude, setSelectedExclude] = useState("none");
  const [configOpen, setConfigOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [updatingSource, setUpdatingSource] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!excludesLoaded) void loadExcludes();
  }, [excludesLoaded, loadExcludes]);

  const handleChooseFolders = async () => {
    setError(null);
    const selection = await openFolderDialog({
      directory: true,
      multiple: true,
      title: t("profileFolders.dialogPicker", { name: profile.name }),
    });
    if (!selection) return;
    setPendingPaths(Array.isArray(selection) ? selection : [selection]);
    setSelectedExclude("none");
    setConfigOpen(true);
  };

  const handleAdd = async () => {
    setAdding(true);
    setError(null);
    const excludeProfileId =
      selectedExclude === "none" ? null : Number(selectedExclude);
    const failures: string[] = [];
    for (const path of pendingPaths) {
      try {
        await addSource(profile.id, path, excludeProfileId);
      } catch (cause) {
        failures.push(toAppError(cause).message);
      }
    }
    setAdding(false);
    if (failures.length > 0) {
      setError(failures.join(" "));
      return;
    }
    setConfigOpen(false);
    setPendingPaths([]);
  };

  const handleRemove = async (sourceId: number) => {
    setError(null);
    try {
      await removeSource(sourceId);
    } catch (cause) {
      setError(toAppError(cause).message);
    }
  };

  const handleExcludeChange = async (sourceId: number, value: string) => {
    setUpdatingSource(sourceId);
    setError(null);
    try {
      await setSourceExcludeProfile(
        sourceId,
        value === "none" ? null : Number(value),
      );
    } catch (cause) {
      setError(toAppError(cause).message);
    } finally {
      setUpdatingSource(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-6">
        <p className="text-sm text-muted-foreground">
          {t("profileFolders.description")}
        </p>
        <Button onClick={handleChooseFolders} disabled={adding}>
          {adding ? <Loader2 className="animate-spin" /> : <FolderPlus />}
          {t("profileFolders.add")}
        </Button>
      </div>

      {sources.length === 0 ? (
        <EmptyState
          icon={Folder}
          title={t("profileFolders.emptyTitle")}
          description={t("profileFolders.emptyDescription")}
          action={
            <Button onClick={handleChooseFolders} disabled={adding}>
              <FolderPlus />
              {t("profileFolders.add")}
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {sources.map((source) => (
            <li
              key={source.id}
              className="group grid grid-cols-[minmax(0,1fr)_14rem_auto] items-center gap-3 rounded-xl bg-muted/35 px-3 py-2.5 text-sm ring-1 ring-inset ring-border/45"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Folder className="h-4 w-4 shrink-0 text-brand" />
                <span className="select-text truncate" title={source.path}>
                  {source.path}
                </span>
              </div>
              <Select
                value={source.excludeProfileId?.toString() ?? "none"}
                onValueChange={(value) =>
                  void handleExcludeChange(source.id, value)
                }
                disabled={updatingSource === source.id}
              >
                <SelectTrigger aria-label={t("profileFolders.excludeFor", { path: source.path })}>
                  <ShieldOff className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder={t("profileFolders.noExclude")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("profileFolders.noExclude")}</SelectItem>
                  {excludeProfiles.map((excludeProfile) => (
                    <SelectItem
                      key={excludeProfile.id}
                      value={excludeProfile.id.toString()}
                    >
                      {excludeProfile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => void handleRemove(source.id)}
                className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                aria-label={t("profileFolders.remove", { path: source.path })}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("profileFolders.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {pendingPaths.length === 1
                ? t("profileFolders.dialogOne")
                : t("profileFolders.dialogMany", { count: pendingPaths.length })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="max-h-32 space-y-1 overflow-auto rounded-md bg-muted/50 p-3">
              {pendingPaths.map((path) => (
                <p key={path} className="truncate text-xs" title={path}>
                  {path}
                </p>
              ))}
            </div>
            <div className="grid gap-2">
              <Label>{t("profileFolders.excludeProfile")}</Label>
              <Select value={selectedExclude} onValueChange={setSelectedExclude}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("profileFolders.none")}</SelectItem>
                  {excludeProfiles.map((excludeProfile) => (
                    <SelectItem
                      key={excludeProfile.id}
                      value={excludeProfile.id.toString()}
                    >
                      {excludeProfile.name} ({t("profileFolders.activeRules", { count: excludeProfile.rules.filter((r) => r.enabled).length })})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {excludeProfiles.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t("profileFolders.noProfiles")}
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfigOpen(false)}
              disabled={adding}
            >
              {t("profileFolders.cancel")}
            </Button>
            <Button onClick={() => void handleAdd()} disabled={adding}>
              {adding ? <Loader2 className="animate-spin" /> : <FolderPlus />}
              {t("profileFolders.addCount", { kind: t(pendingPaths.length === 1 ? "profileFolders.folder" : "profileFolders.folders") })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


