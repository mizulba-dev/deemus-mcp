import type { ToolHandler } from "../../schemas/tool.js";
import { handleProjectDelete } from "./handler.js";

export const projectDeleteTool: ToolHandler = {
  definition: {
    name: "project_delete",
    description:
      "Delete a project that has no judgments at all, discarded ones included. Its workstreams are deleted with it. This cannot be undone. " +
      "Call it only when the user asked to delete it, and name the project before calling. " +
      "A project that still has judgments is rejected: move them with judgment_update, or merge the project into another with project_merge.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "integer",
          description: "Project id from project_list.",
        },
      },
      required: ["project_id"],
    },
  },
  handler: handleProjectDelete,
};
