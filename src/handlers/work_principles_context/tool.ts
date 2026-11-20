import type { ToolHandler } from "../../schemas/tool.js";
import { handleWorkPrinciplesContext } from "./handler.js";

export const workPrinciplesContextTool: ToolHandler = {
  definition: {
    name: "work_principles_context",
    description:
      "Get what work_principles_propose needs: the user's latest recorded judgments across all projects " +
      "(id, title, involvement, project, workstream, decided_on, situation_or_request, reason; up to 200, strings cut at 300 characters), " +
      "the work principles they already have (id, title, body, status candidate or adopted, evidence_ids), and new_judgments, the number recorded since the last proposal. " +
      "Read it before proposing, and propose only criteria that are not already in principles.",
    inputSchema: { type: "object", properties: {} },
  },
  handler: handleWorkPrinciplesContext,
};
