import type { ToolHandler } from "../../schemas/tool.js";
import { handleJudgmentGet } from "./handler.js";

export const judgmentGetTool: ToolHandler = {
  definition: {
    name: "judgment_get",
    description:
      "Get one recorded judgment with every field, nothing cut: the project, workstream, all keys of detail for its involvement, evidence, outcome, skills (tech and domain names), skill_suggestions, the session it was recorded from (source_tool, source_session_id), scope (direction, local, or null when not yet set), scope_by_user (true when the user set the scope themselves) and supersedes (the judgments it replaced). " +
      "Use it to read a judgment before you fix it with judgment_update, or to check the result of a fix. " +
      "Get judgment ids from judgment_search or from the judgment_add response. A judgment the user discarded is not found.",
    inputSchema: {
      type: "object",
      properties: {
        judgment_id: {
          type: "integer",
          description: "Id of the judgment.",
        },
      },
      required: ["judgment_id"],
    },
  },
  handler: handleJudgmentGet,
};
