import type { ApiClient } from "../../services/api/client.js";
import { pick, run } from "../common.js";
import { requireProjectId } from "../project_context/handler.js";

export async function handleJudgmentSearch(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () =>
    apiClient.post(
      `/api/v1/mcp/projects/${requireProjectId(args)}/judgments/search`,
      pick(args, ["query", "include_superseded", "limit"]),
    ),
  );
}
