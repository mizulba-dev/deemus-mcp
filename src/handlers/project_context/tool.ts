import type { ToolHandler } from "../../schemas/tool.js";
import { handleProjectContext } from "./handler.js";

export const projectContextTool: ToolHandler = {
  definition: {
    name: "project_context",
    description:
      "Get what judgment_add needs for one project: the project, its existing workstreams (id, name, summary, judgment_count), " +
      "the user's skill names (tech, domain) and workstream_rule, the rule for how coarse a workstream should be. " +
      "Call this before judgment_add and choose workstreams from the returned list.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "integer",
          description: "Project id from project_list or project_create.",
        },
      },
      required: ["project_id"],
    },
  },
  handler: handleProjectContext,
};
