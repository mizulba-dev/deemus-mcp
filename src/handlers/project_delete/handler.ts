import type { ApiClient } from "../../services/api/client.js";
import { requireId, run } from "../common.js";

export async function handleProjectDelete(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () =>
    apiClient.delete(`/api/v1/mcp/projects/${requireId(args, "project_id")}`),
  );
}
