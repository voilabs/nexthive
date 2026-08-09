import { invokeCommand } from "@/lib/tauri";
import type { ConnectionTestResult, CreateS3AccountInput, S3Account } from "@/types";

export const s3Api = {
  list(): Promise<S3Account[]> { return invokeCommand("list_s3_accounts"); },
  add(input: CreateS3AccountInput): Promise<S3Account> { return invokeCommand("add_s3_account", { input }); },
  test(id: number): Promise<ConnectionTestResult> { return invokeCommand("test_s3_connection", { id }); },
  remove(id: number): Promise<void> { return invokeCommand("remove_s3_account", { id }); },
};
