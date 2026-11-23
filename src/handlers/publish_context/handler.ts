import type { ApiClient } from "../../services/api/client.js";
import { InvalidInputError, run } from "../common.js";

export async function handlePublishContext(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () => {
    const beforeId = args?.before_id;
    if (beforeId === undefined || beforeId === null) {
      return apiClient.get("/api/v1/mcp/publish/context");
    }
    if (
      typeof beforeId !== "number" ||
      !Number.isSafeInteger(beforeId) ||
      beforeId < 1
    ) {
      throw new InvalidInputError("before_id must be a positive integer");
    }
    return apiClient.get(`/api/v1/mcp/publish/context?before_id=${beforeId}`);
  });
}
