import type { ApiClient } from "../../services/api/client.js";
import { pick, requireId, run } from "../common.js";

export async function handleWorkPrinciplesAdopt(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () =>
    apiClient.post(
      `/api/v1/mcp/work-principles/${requireId(args, "principle_id")}/adopt`,
      pick(args, ["title", "body"]),
    ),
  );
}
