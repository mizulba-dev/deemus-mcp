import type { ToolHandler } from "../../schemas/tool.js";
import { SCOPE_PROPERTY } from "../judgment_add/tool.js";
import { handleJudgmentScopeSet } from "./handler.js";

export const judgmentScopeSetTool: ToolHandler = {
  definition: {
    name: "judgment_scope_set",
    description:
      "Set the scope of recorded judgments, 1-100 per call, each item {judgment_id, scope}. Use it only when the user asked to set or review the scope of recorded judgments. " +
      "A judgment whose scope the user set themselves is never changed: it comes back in skipped_user_set. Judgments that are not found (or were discarded) come back in not_found; the others in updated. " +
      "The same judgment_id twice in one call, or a scope other than direction or local, rejects the whole call. " +
      "To change a scope because the user said so, use judgment_update instead.",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          minItems: 1,
          maxItems: 100,
          description: "1 to 100 judgments with their scope.",
          items: {
            type: "object",
            properties: {
              judgment_id: {
                type: "integer",
                description: "Id from judgment_scope_list.",
              },
              scope: SCOPE_PROPERTY,
            },
            required: ["judgment_id", "scope"],
          },
        },
      },
      required: ["items"],
    },
  },
  handler: handleJudgmentScopeSet,
};
