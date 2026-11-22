import type { ApiClient } from "../../services/api/client.js";
import { requireId, run } from "../common.js";

export async function handleJudgmentGet(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () =>
    apiClient.get(`/api/v1/mcp/judgments/${requireId(args, "judgment_id")}`),
  );
}
