import type { ToolHandler } from "../../schemas/tool.js";
import { handleJudgmentScopeList } from "./handler.js";

export const judgmentScopeListTool: ToolHandler = {
  definition: {
    name: "judgment_scope_list",
    description:
      "List the judgments of one project whose scope is not set yet, newest first, so you can set it with judgment_scope_set. Use it only when the user asked to set or review the scope of recorded judgments. " +
      "Each judgment has id, title, involvement, workstream, decided_on, situation, decision, rejected_options, reason (the user's own reason; empty for delegated) and outcome (strings cut at 300 characters). " +
      "remaining is how many judgments of the project still have no scope. When next_before_id is not null, older ones remain: call again with before_id set to it, and repeat until it is null.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "integer",
          description: "Project id from project_list.",
        },
        before_id: {
          type: "integer",
          description:
            "next_before_id from the previous call. Leave it out for the newest.",
        },
        limit: {
          type: "integer",
          description: "Number of judgments, 1-100. Default 50.",
        },
      },
      required: ["project_id"],
    },
  },
  handler: handleJudgmentScopeList,
};
