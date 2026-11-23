import type { ApiClient } from "../../services/api/client.js";
import { pick, requireId, run } from "../common.js";

export async function handleWorkPrinciplesUpdate(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () =>
    apiClient.patch(
      `/api/v1/mcp/work-principles/${requireId(args, "principle_id")}`,
      pick(args, ["title", "body", "area"]),
    ),
  );
}
