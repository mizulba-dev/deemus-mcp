import type { ApiClient } from "../../services/api/client.js";
import { InvalidInputError, requireString, run } from "../common.js";

export async function handleJudgmentDiscard(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () => {
    const id = requireString(args, "judgment_id");
    if (!/^[1-9][0-9]*$/.test(id)) {
      throw new InvalidInputError("judgment_id must be a positive integer");
    }
    return apiClient.delete(`/api/v1/mcp/judgments/${id}`);
  });
}
