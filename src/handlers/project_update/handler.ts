import type { ApiClient } from "../../services/api/client.js";
import { pick, requireId, run } from "../common.js";

export async function handleProjectUpdate(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () =>
    apiClient.patch(
      `/api/v1/mcp/projects/${requireId(args, "project_id")}`,
      pick(args, ["name", "summary", "repo_names", "kind"]),
    ),
  );
}
