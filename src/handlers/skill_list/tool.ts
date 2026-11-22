import type { ToolHandler } from "../../schemas/tool.js";
import { handleSkillList } from "./handler.js";

export const skillListTool: ToolHandler = {
  definition: {
    name: "skill_list",
    description:
      "List the user's skill names with ids: skills (id, kind tech or domain, name, hidden, judgment_count), and suggestions: tech names sent with judgments that are not in the list yet, with how many judgments carry each. " +
      "Use it to get skill ids for skill_update and skill_merge, or to see which suggestions are waiting.",
    inputSchema: { type: "object", properties: {} },
  },
  handler: handleSkillList,
};
