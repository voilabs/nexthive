import { useEffect } from "react";

import { useUpdaterStore } from "@/stores/updater";

/** Runs one quiet update check when the desktop UI starts. */
export function useAppUpdates() {
  const status = useUpdaterStore((state) => state.status);
  const automaticCheckAttempted = useUpdaterStore(
    (state) => state.automaticCheckAttempted,
  );
  const check = useUpdaterStore((state) => state.check);

  useEffect(() => {
    if (status === "idle" && !automaticCheckAttempted) void check(true);
  }, [status, automaticCheckAttempted, check]);
}
