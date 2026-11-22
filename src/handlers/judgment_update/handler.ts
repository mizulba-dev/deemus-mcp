import type { ApiClient } from "../../services/api/client.js";
import { InvalidInputError, pick, requireString, run } from "../common.js";

function requireJudgmentId(args: Record<string, unknown> | undefined): string {
  const id = requireString(args, "judgment_id");
  if (!/^[1-9][0-9]*$/.test(id)) {
    throw new InvalidInputError("judgment_id must be a positive integer");
  }
  return id;
}

export async function handleJudgmentUpdate(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () =>
    apiClient.patch(
      `/api/v1/mcp/judgments/${requireJudgmentId(args)}`,
      pick(args, [
        "title",
        "detail",
        "evidence",
        "outcome",
        "reason",
        "superseded_by_id",
      ]),
    ),
  );
}
