import type { ApiClient } from "../../services/api/client.js";
import { InvalidInputError, run } from "../common.js";
import { requireProjectId } from "../project_context/handler.js";

function positiveInteger(
  args: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  const value = args?.[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new InvalidInputError(`${key} must be a positive integer`);
  }
  return value;
}

export async function handleJudgmentScopeList(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () => {
    const projectId = requireProjectId(args);
    const query = new URLSearchParams();
    const beforeId = positiveInteger(args, "before_id");
    if (beforeId !== undefined) query.set("before_id", String(beforeId));
    const limit = positiveInteger(args, "limit");
    if (limit !== undefined) query.set("limit", String(limit));
    const qs = query.toString();
    return apiClient.get(
      `/api/v1/mcp/projects/${projectId}/judgments/unscoped${qs ? `?${qs}` : ""}`,
    );
  });
}
