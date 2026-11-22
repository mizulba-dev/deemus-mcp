import type { ApiClient } from "../../services/api/client.js";
import { pick, run } from "../common.js";

export async function handleJudgmentScopeSet(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () =>
    apiClient.post("/api/v1/mcp/judgments/scope", pick(args, ["items"])),
  );
}
