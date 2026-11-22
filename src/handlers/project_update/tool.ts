import type { ToolHandler } from "../../schemas/tool.js";
import { handleProjectUpdate } from "./handler.js";

export const projectUpdateTool: ToolHandler = {
  definition: {
    name: "project_update",
    description:
      "Change a project's name, summary, repository names or kind. Send only the fields to change. " +
      "repo_names replaces the whole list. kind is work or personal. " +
      "Write a summary only from what the user said or what the repository shows; do not invent one.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "integer",
          description: "Project id from project_list.",
        },
        name: {
          type: "string",
          description: "New name, 1-100 characters.",
        },
        summary: {
          type: "string",
          description:
            "One or two sentences about the project, up to 1000 characters.",
        },
        repo_names: {
          type: "array",
          items: { type: "string" },
          description: "Repository names (up to 10, each 1-100 characters).",
        },
        kind: {
          type: "string",
          enum: ["work", "personal"],
          description: "work or personal.",
        },
      },
      required: ["project_id"],
    },
  },
  handler: handleProjectUpdate,
};
