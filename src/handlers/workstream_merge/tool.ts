import type { ToolHandler } from "../../schemas/tool.js";
import { handleWorkstreamMerge } from "./handler.js";

export const workstreamMergeTool: ToolHandler = {
  definition: {
    name: "workstream_merge",
    description:
      "Merge one workstream into another of the same project: move every judgment of workstream_id into into_workstream_id, then delete workstream_id. This cannot be undone. " +
      "Call it only when the user asked to merge, and name both workstreams before calling. " +
      "To move a workstream's judgments to another project, move each judgment with judgment_update instead.",
    inputSchema: {
      type: "object",
      properties: {
        workstream_id: {
          type: "integer",
          description: "Id of the workstream to merge and delete.",
        },
        into_workstream_id: {
          type: "integer",
          description: "Id of the workstream that remains.",
        },
      },
      required: ["workstream_id", "into_workstream_id"],
    },
  },
  handler: handleWorkstreamMerge,
};
