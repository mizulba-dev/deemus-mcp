import type { ApiClient } from "../../services/api/client.js";
import { InvalidInputError, requireString, run } from "../common.js";
import { requireProjectId } from "../project_context/handler.js";

function requireIntoProjectId(
  args: Record<string, unknown> | undefined,
): number {
  const id = requireString(args, "into_project_id");
  if (!/^[1-9][0-9]*$/.test(id)) {
    throw new InvalidInputError("into_project_id must be a positive integer");
  }
  return Number(id);
}

export async function handleProjectMerge(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () => {
    const id = requireProjectId(args);
    const into = requireIntoProjectId(args);
    return apiClient.post(`/api/v1/mcp/projects/${id}/merge`, {
      into_project_id: into,
    });
  });
}
