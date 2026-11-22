import type { ToolHandler } from "../../schemas/tool.js";
import { handleSkillMerge } from "./handler.js";

export const skillMergeTool: ToolHandler = {
  definition: {
    name: "skill_merge",
    description:
      "Merge one skill into another of the same kind: link every judgment of skill_id to into_skill_id, then delete skill_id. This cannot be undone. " +
      "Call it only when the user asked to merge, and name both skills before calling. Get skill ids from skill_list.",
    inputSchema: {
      type: "object",
      properties: {
        skill_id: {
          type: "integer",
          description: "Id of the skill to merge and delete.",
        },
        into_skill_id: {
          type: "integer",
          description: "Id of the skill that remains.",
        },
      },
      required: ["skill_id", "into_skill_id"],
    },
  },
  handler: handleSkillMerge,
};
