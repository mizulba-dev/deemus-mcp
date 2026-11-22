import type { ToolHandler } from "../../schemas/tool.js";
import { handleWorkPrinciplesContext } from "./handler.js";

export const workPrinciplesContextTool: ToolHandler = {
  definition: {
    name: "work_principles_context",
    description:
      "Get what work_principles_propose needs: the user's recorded judgments across all projects, newest first, 200 per call " +
      "(id, title, involvement, project, workstream, decided_on, situation_or_request, reason; strings cut at 300 characters), " +
      "the work principles they already have (id, title, body, status candidate or adopted, evidence_ids), new_judgments, the number recorded since the last proposal, " +
      "and next_before_id. When next_before_id is not null, older judgments remain: call again with before_id set to it, and repeat until it is null to read every judgment. " +
      "Read it before proposing, and propose only criteria that are not already in principles.",
    inputSchema: {
      type: "object",
      properties: {
        before_id: {
          type: "integer",
          description:
            "next_before_id from the previous call. Returns the judgments older than that one. Leave it out for the newest.",
        },
      },
    },
  },
  handler: handleWorkPrinciplesContext,
};
