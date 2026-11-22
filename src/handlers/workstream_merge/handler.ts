import type { ApiClient } from "../../services/api/client.js";
import { requireId, run } from "../common.js";

export async function handleWorkstreamMerge(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  return run(async () => {
    const id = requireId(args, "workstream_id");
    const into = Number(requireId(args, "into_workstream_id"));
    return apiClient.post(`/api/v1/mcp/workstreams/${id}/merge`, {
      into_workstream_id: into,
    });
  });
}
