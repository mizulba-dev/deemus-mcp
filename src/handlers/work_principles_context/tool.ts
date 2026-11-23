import type { ToolHandler } from "../../schemas/tool.js";
import { handleWorkPrinciplesContext } from "./handler.js";

export const workPrinciplesContextTool: ToolHandler = {
  definition: {
    name: "work_principles_context",
    description:
      "Get what work_principles_propose needs: the user's judgments that set a direction, across all projects, newest first, 10 per call. " +
      "Only judgments the user decided themselves (with options or a reason) or adopted with their own reason, and not scoped as local, are included; " +
      "delegated judgments, choices that held only for one piece of work (scope local) and records with neither options nor a reason are left out. " +
      "Each judgment has id, title, involvement (self or adopted), project, workstream, decided_on, situation_or_request (the situation), " +
      "decision (what the user decided; for adopted, the AI's proposal they took), rejected_options (the labels of the options the user did not take; empty for adopted) and reason; strings cut at 300 characters. " +
      "Also returns the work principles they already have (id, title, body, status candidate or adopted, evidence_ids), new_judgments, the number of such judgments recorded since the last proposal, " +
      "and next_before_id. When next_before_id is not null, older judgments remain: call again with before_id set to it, and repeat until it is null to read every judgment that meets these criteria. " +
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
