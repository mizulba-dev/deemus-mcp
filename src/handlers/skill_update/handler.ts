import type { ApiClient } from "../../services/api/client.js";
import { pick, requireId, run } from "../common.js";

export async function handleSkillUpdate(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () =>
    apiClient.patch(
      `/api/v1/mcp/skills/${requireId(args, "skill_id")}`,
      pick(args, ["name", "hidden"]),
    ),
  );
}
