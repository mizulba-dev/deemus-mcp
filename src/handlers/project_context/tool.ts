import type { ToolHandler } from "../../schemas/tool.js";
import { handleProjectContext } from "./handler.js";

export const projectContextTool: ToolHandler = {
  definition: {
    name: "project_context",
    description:
      "Get what judgment_add needs for one project: the project, its existing features (id, name, summary, judgment_count), " +
      "the user's skill names (tech, domain) and feature_rule, the rule for how coarse a feature should be. " +
      "Call this before judgment_add and choose features from the returned list.",
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
