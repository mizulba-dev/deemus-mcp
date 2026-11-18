import type { ApiClient } from "../../services/api/client.js";
import { pick, requireString, run } from "../common.js";

export async function handleProjectCreate(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () => {
    requireString(args, "name");
    return apiClient.post(
      "/api/v1/mcp/projects",
      pick(args, ["name", "summary", "repo_names"]),
    );
  });
}
