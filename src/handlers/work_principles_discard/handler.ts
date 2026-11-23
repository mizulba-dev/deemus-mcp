import type { ApiClient } from "../../services/api/client.js";
import { requireId, run } from "../common.js";

export async function handleWorkPrinciplesDiscard(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () =>
    apiClient.delete(
      `/api/v1/mcp/work-principles/${requireId(args, "principle_id")}`,
    ),
  );
}
