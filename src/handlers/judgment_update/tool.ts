import type { ToolHandler } from "../../schemas/tool.js";
import { handleJudgmentUpdate } from "./handler.js";

export const judgmentUpdateTool: ToolHandler = {
  definition: {
    name: "judgment_update",
    description:
      "Add to a judgment that is already recorded: the outcome, the user's reason, or the judgment that replaced it. " +
      "Send only what the user said; never fill outcome or reason in by guessing. Send at least one field. " +
      "outcome and reason replace the current value (1-2000 characters) and cannot be emptied here. " +
      "reason is the user's own reason: it is saved as reason for a self judgment and as own_reason for an adopted one, and is rejected for a delegated one. " +
      "superseded_by_id is the id of the judgment that replaced this one, from the same project and not itself revised; send null to undo it. " +
      "The response is the updated judgment in the same shape as a judgment_search result. " +
      "Get judgment ids from judgment_search or from the judgment_add response.",
    inputSchema: {
      type: "object",
      properties: {
        judgment_id: {
          type: "integer",
          description: "Id of the judgment to update.",
        },
        outcome: {
          type: "string",
          description: "What came of it, 1-2000 characters.",
        },
        reason: {
          type: "string",
          description: "The user's own reason, 1-2000 characters.",
        },
        superseded_by_id: {
          type: ["integer", "null"],
          description:
            "Id of the judgment that replaced this one. null clears it.",
        },
      },
      required: ["judgment_id"],
    },
  },
  handler: handleJudgmentUpdate,
};
