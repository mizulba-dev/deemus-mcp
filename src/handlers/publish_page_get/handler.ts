import type { ApiClient } from "../../services/api/client.js";
import { run } from "../common.js";

export async function handlePublishPageGet(
  _args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(() => apiClient.get("/api/v1/mcp/publish/page"));
}
