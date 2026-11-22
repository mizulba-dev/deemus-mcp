import type { ToolHandler } from "../../schemas/tool.js";
import { DETAIL_PROPERTIES } from "../judgment_add/tool.js";
import { handleJudgmentUpdate } from "./handler.js";

export const judgmentUpdateTool: ToolHandler = {
  definition: {
    name: "judgment_update",
    description:
      "Fix or add to a judgment that is already recorded: the title, fields of detail, evidence, the outcome, the user's reason, or the judgment that replaced it. " +
      "Send only what the user said; never fill outcome or reason in by guessing. Send at least one field. " +
      "title replaces the title (1-80 characters). " +
      "detail changes only the keys you send, within the keys of the judgment's current involvement (the same keys and limits as judgment_add); keys you leave out keep their values. reason and own_reason cannot be sent in detail; send the user's reason as reason. options and ai_decisions replace the whole list, so send every item you want to keep. " +
      "evidence replaces all quotes (up to 3, each 1-200 characters, the user's own words only); send [] to remove them. " +
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
        title: {
          type: "string",
          description: "New title, 1-80 characters.",
        },
        detail: {
          type: "object",
          description:
            "Fields of detail to change. Only the keys sent are replaced; they must belong to the judgment's involvement.",
          properties: DETAIL_PROPERTIES,
        },
        evidence: {
          type: "array",
          maxItems: 3,
          items: { type: "string" },
          description:
            "Quotes of the user's own words that replace the current ones, each 1-200 characters. [] removes them.",
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
