import type { ApiClient } from "../../services/api/client.js";
import { pick, run } from "../common.js";
import { requireProjectId } from "../project_context/handler.js";

export async function handleJudgmentAdd(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () =>
    apiClient.post(
      `/api/v1/mcp/projects/${requireProjectId(args)}/judgments`,
      pick(args, ["source", "judgments"]),
    ),
  );
}
