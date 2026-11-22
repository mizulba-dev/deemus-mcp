import type { ToolHandler } from "../../schemas/tool.js";
import { handleSkillSuggestionDiscard } from "./handler.js";

export const skillSuggestionDiscardTool: ToolHandler = {
  definition: {
    name: "skill_suggestion_discard",
    description:
      "Remove a suggested tech name (from the suggestions of skill_list) from every judgment that carries it, without adding it to the list. " +
      "Call it only when the user decided not to add that name.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The suggested name, exactly as skill_list shows it.",
        },
      },
      required: ["name"],
    },
  },
  handler: handleSkillSuggestionDiscard,
};
