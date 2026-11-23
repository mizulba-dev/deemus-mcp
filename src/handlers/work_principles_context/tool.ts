import type { ToolHandler } from "../../schemas/tool.js";
import { handleWorkPrinciplesContext } from "./handler.js";

export const workPrinciplesContextTool: ToolHandler = {
  definition: {
    name: "work_principles_context",
    description:
      "Get what work_principles_propose needs: the user's judgments that set a direction, across all projects, newest first, up to 50 per call and fewer when the judgments are long. " +
      "Only judgments the user decided themselves (with options or a reason) or adopted with their own reason, and not scoped as local, are included; " +
      "delegated judgments, choices that held only for one piece of work (scope local) and records with neither options nor a reason are left out. " +
      "Each judgment has id, title, involvement (self or adopted), project, project_kind (work or personal), workstream, decided_on, situation_or_request (the situation), " +
      "decision (what the user decided; for adopted, the AI's proposal they took), rejected_options (the labels of the options the user did not take; empty for adopted) and reason; strings cut at 300 characters. " +
      "Also returns new_judgments, the number of such judgments recorded since the last proposal, " +
      "and next_before_id. Only the first call (without before_id) also returns the work principles they already have (principles: id, title, body cut at 300 characters, status candidate or adopted, area (the name of the domain skill it is grouped by, or null), evidence_ids); later calls leave principles out. When next_before_id is not null, older judgments remain: call again with before_id set to it, and repeat until it is null to read every judgment that meets these criteria. " +
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
