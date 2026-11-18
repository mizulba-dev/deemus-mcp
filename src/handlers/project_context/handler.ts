import type { ApiClient } from "../../services/api/client.js";
import { InvalidInputError, requireString, run } from "../common.js";

export function requireProjectId(
  args: Record<string, unknown> | undefined,
): string {
  const id = requireString(args, "project_id");
  if (!/^[1-9][0-9]*$/.test(id)) {
    throw new InvalidInputError("project_id must be a positive integer");
  }
  return id;
}

export async function handleProjectContext(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () =>
    apiClient.get(`/api/v1/mcp/projects/${requireProjectId(args)}/context`),
  );
}
