import type { ApiClient } from "../../services/api/client.js";
import { run } from "../common.js";

export async function handleSkillList(
  _args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () => apiClient.get("/api/v1/mcp/skills"));
}
