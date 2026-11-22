import type { ToolHandler } from "../../schemas/tool.js";
import { handleWorkstreamUpdate } from "./handler.js";

export const workstreamUpdateTool: ToolHandler = {
  definition: {
    name: "workstream_update",
    description:
      "Rename a workstream or rewrite its summary. Send only the fields to change. " +
      "A name already used by another workstream of the same project is rejected; to combine the two, use workstream_merge. " +
      "Get workstream ids from project_context or from judgment results.",
    inputSchema: {
      type: "object",
      properties: {
        workstream_id: {
          type: "integer",
          description: "Id of the workstream.",
        },
        name: {
          type: "string",
          description: "New name, 1-80 characters.",
        },
        summary: {
          type: "string",
          description: "New one-sentence summary, up to 200 characters.",
        },
      },
      required: ["workstream_id"],
    },
  },
  handler: handleWorkstreamUpdate,
};
