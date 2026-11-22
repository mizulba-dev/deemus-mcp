import type { ToolHandler } from "../../schemas/tool.js";
import { handleSkillAdd } from "./handler.js";

export const skillAddTool: ToolHandler = {
  definition: {
    name: "skill_add",
    description:
      "Add a tech or domain name to the user's skill list. The list is kept short on purpose, so call it only when the user asked to add that name. " +
      "If the name is already in the list, it is returned with created=false; if that skill is hidden, show it again with skill_update only when the user asks. " +
      "Judgments that carry the name as a suggestion are linked to the skill and the suggestion is removed; linked_judgments is how many judgments carried it.",
    inputSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["tech", "domain"],
          description: "tech for technologies, domain for areas of work.",
        },
        name: {
          type: "string",
          description: "Skill name, 1-40 characters.",
        },
      },
      required: ["kind", "name"],
    },
  },
  handler: handleSkillAdd,
};
