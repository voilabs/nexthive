import { invokeCommand } from "@/lib/tauri";

export const windowApi = {
  minimize(): Promise<void> {
    return invokeCommand("minimize_main_window");
  },
  toggleMaximize(): Promise<void> {
    return invokeCommand("toggle_maximize_main_window");
  },
  close(): Promise<void> {
    return invokeCommand("close_main_window");
  },
  startDragging(): Promise<void> {
    return invokeCommand("start_dragging_main_window");
  },
};
