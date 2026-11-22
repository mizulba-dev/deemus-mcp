import type { ToolHandler } from "../../schemas/tool.js";
import { handleSkillUpdate } from "./handler.js";

export const skillUpdateTool: ToolHandler = {
  definition: {
    name: "skill_update",
    description:
      "Rename a skill or hide it from the user's list (hidden skills stay linked to their judgments). Send only the fields to change. " +
      "A name already used by another skill of the same kind is rejected; to combine the two, use skill_merge. Get skill ids from skill_list.",
    inputSchema: {
      type: "object",
      properties: {
        skill_id: { type: "integer", description: "Id of the skill." },
        name: { type: "string", description: "New name, 1-40 characters." },
        hidden: { type: "boolean", description: "true hides the skill." },
      },
      required: ["skill_id"],
    },
  },
  handler: handleSkillUpdate,
};
