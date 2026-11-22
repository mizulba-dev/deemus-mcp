import type { ToolHandler } from "../../schemas/tool.js";
import { handleJudgmentDiscard } from "./handler.js";

export const judgmentDiscardTool: ToolHandler = {
  definition: {
    name: "judgment_discard",
    description:
      "Discard a recorded judgment, for example a duplicate the user wants to drop. Call it only when the user asked to discard it, and name the judgment (title and id) before calling. " +
      "A discarded judgment disappears from judgment_search and is not recorded again when judgment_add sends it with the same session_id and its original title. " +
      "If another judgment was marked as replaced by it, that mark is removed. " +
      "Get judgment ids from judgment_search or from the judgment_add response.",
    inputSchema: {
      type: "object",
      properties: {
        judgment_id: {
          type: "integer",
          description: "Id of the judgment to discard.",
        },
      },
      required: ["judgment_id"],
    },
  },
  handler: handleJudgmentDiscard,
};
