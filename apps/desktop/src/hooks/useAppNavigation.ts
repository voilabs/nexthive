import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useNavigate } from "react-router";

/** Navigate the React router in response to native tray menu actions. */
export function useAppNavigation() {
  const navigate = useNavigate();

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<string>("app-navigate", (event) => navigate(event.payload)).then(
      (cleanup) => {
        if (disposed) cleanup();
        else unlisten = cleanup;
      },
    );
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [navigate]);
}
