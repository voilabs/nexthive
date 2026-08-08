import { invoke, type InvokeArgs } from "@tauri-apps/api/core";
import { toAppError } from "@/types/errors";

/**
 * Thin wrapper around Tauri's `invoke` that normalizes backend errors
 * into the `AppError` shape so UI code can rely on `{ kind, message }`.
 */
export async function invokeCommand<T>(
  command: string,
  args?: InvokeArgs,
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw toAppError(error);
  }
}
