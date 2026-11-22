import type { ApiClient } from "../../services/api/client.js";
import { pick, requireString, run } from "../common.js";

export async function handleSkillAdd(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () => {
    requireString(args, "kind");
    requireString(args, "name");
    return apiClient.post("/api/v1/mcp/skills", pick(args, ["kind", "name"]));
  });
}
