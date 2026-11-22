import type { ToolHandler } from "../../schemas/tool.js";
import { handleProjectMerge } from "./handler.js";

export const projectMergeTool: ToolHandler = {
  definition: {
    name: "project_merge",
    description:
      "Merge one project into another: move all workstreams and judgments of project_id into into_project_id, then delete project_id. This cannot be undone. " +
      "Call it only when the user asked to merge, and before calling, name both projects (from project_list) and get the user's confirmation. " +
      "A workstream with exactly the same name in both projects becomes one workstream of into_project_id; the others move as they are. " +
      "repo_names of both projects are combined (up to 10; over that, nothing changes and an error is returned). " +
      "The response is the merged project (id, name, summary, repo_names).",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "integer",
          description:
            "Id of the project to merge and delete, from project_list.",
        },
        into_project_id: {
          type: "integer",
          description: "Id of the project that remains, from project_list.",
        },
      },
      required: ["project_id", "into_project_id"],
    },
  },
  handler: handleProjectMerge,
};
