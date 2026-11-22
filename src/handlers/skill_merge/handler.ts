import type { ApiClient } from "../../services/api/client.js";
import { requireId, run } from "../common.js";

export async function handleSkillMerge(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () => {
    const id = requireId(args, "skill_id");
    const into = Number(requireId(args, "into_skill_id"));
    return apiClient.post(`/api/v1/mcp/skills/${id}/merge`, {
      into_skill_id: into,
    });
  });
}
