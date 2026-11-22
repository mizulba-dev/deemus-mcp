import type { ApiClient } from "../../services/api/client.js";
import { pick, requireId, run } from "../common.js";

export async function handleWorkstreamUpdate(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () =>
    apiClient.patch(
      `/api/v1/mcp/workstreams/${requireId(args, "workstream_id")}`,
      pick(args, ["name", "summary"]),
    ),
  );
}
