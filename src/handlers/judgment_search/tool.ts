import type { ToolHandler } from "../../schemas/tool.js";
import { handleJudgmentSearch } from "./handler.js";

export const judgmentSearchTool: ToolHandler = {
  definition: {
    name: "judgment_search",
    description:
      "Search the judgments the user recorded in one project (keyword and semantic search combined). " +
      "Use it automatically only when you work inside a repository: call it before you propose a design, an implementation approach or a refactoring direction, so that the proposal does not contradict what the user decided or the options the user rejected. " +
      "Each result has id, title, involvement, workstream, decided_on, superseded_by_id, scope (direction, local, or null when not yet set), scope_by_user, situation, decision, rejected_options, reason and outcome (strings cut at 300 characters), so one call is enough to decide. " +
      "mode is hybrid, or keyword when semantic search is unavailable. " +
      "Judgments the user has since revised are left out unless include_superseded is true; use it to see what a decision replaced. " +
      "session_id narrows the results to the judgments recorded from that session (source.session_id of judgment_add); with session_id, query may be left out and semantic search is not used. To read one judgment in full, use judgment_get. " +
      "Inside a repository, choose the project by comparing the repository name with repo_names from project_list, then with name. When exactly one project fits, search it. When none or several fit and you were about to search on your own, do not search: go on without it, do not ask the user and do not create a project. When the user asked you to search and none or several fit, ask which project they mean. " +
      "Without a repository, call it only when the user asked you to look at past judgments: compare the project name the user mentioned with name, and when it does not settle on exactly one project, ask which project they mean.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "integer",
          description: "Project id from project_list.",
        },
        query: {
          type: "string",
          description:
            "Search words, 1-200 characters. Space-separated words must all match in the keyword search. Required unless session_id is given.",
        },
        session_id: {
          type: "string",
          description:
            "Only judgments recorded from this session, up to 100 characters.",
        },
        include_superseded: {
          type: "boolean",
          description: "Include revised judgments. Default false.",
        },
        limit: {
          type: "integer",
          description: "Number of results, 1-20. Default 10.",
        },
      },
      required: ["project_id"],
    },
  },
  handler: handleJudgmentSearch,
};
