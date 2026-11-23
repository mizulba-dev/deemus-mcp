import type { ToolHandler } from "../../schemas/tool.js";
import { handlePublishContext } from "./handler.js";

export const publishContextTool: ToolHandler = {
  definition: {
    name: "publish_context",
    description:
      "Get what publish_suggest needs: the user's projects and the judgments that could be suggested to show on their page, newest first, up to 50 per call and fewer when the judgments are long. " +
      "Call it only when the user asked you to suggest what to show. " +
      "Only judgments the user decided themselves or adopted from the AI, not discarded, not superseded and not scoped as local, are included; delegated judgments are left out. " +
      "Each judgment has id, title, involvement (self or adopted), project_id, workstream, decided_on, scope, situation, decision (what the user decided; for adopted, the AI's proposal they took), reason, rejected_options (the labels of the options the user did not take), " +
      "needs_reason (true when the user's own reason is empty, so it cannot be shown until they write one), shown, highlighted and previously (null, adopted or dismissed: whether an earlier suggestion for the same content was taken or turned down by the user); strings cut at 300 characters. " +
      "Only the first call (without before_id) also returns projects (id, name, kind work or personal, summary, shown, policy_count, shown_count, highlighted_count, previously); later calls leave projects out. " +
      "Also returns next_before_id. When it is not null, older judgments remain: call again with before_id set to it, and repeat until it is null so you read every judgment before you choose.",
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
  handler: handlePublishContext,
};
