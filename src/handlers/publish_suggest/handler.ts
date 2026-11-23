import type { ApiClient } from "../../services/api/client.js";
import { pick, run } from "../common.js";

export async function handlePublishSuggest(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () =>
    apiClient.post(
      "/api/v1/mcp/publish/suggestions",
      pick(args, ["judgments", "projects"]),
    ),
  );
}
