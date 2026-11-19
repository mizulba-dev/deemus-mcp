import type { ToolHandler } from "../../schemas/tool.js";
import { handleProjectList } from "./handler.js";

export const projectListTool: ToolHandler = {
  definition: {
    name: "project_list",
    description:
      "List the user's projects (id, name, summary, repo_names, workstream_count, judgment_count), ordered by name. " +
      "Compare repo_names with the repository you are working in to pick the project a judgment belongs to. " +
      "If none fits, create one with project_create.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  handler: handleProjectList,
};
