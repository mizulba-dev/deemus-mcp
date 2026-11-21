import type { ToolHandler } from "../../schemas/tool.js";
import { handleJudgmentSearch } from "./handler.js";

export const judgmentSearchTool: ToolHandler = {
  definition: {
    name: "judgment_search",
    description:
      "Search the judgments the user recorded in one project (keyword and semantic search combined). " +
      "Call it before you propose a design, an implementation approach or a refactoring direction, so that the proposal does not contradict what the user decided or the options the user rejected. " +
      "Each result has id, title, involvement, workstream, decided_on, superseded_by_id, situation, decision, rejected_options, reason and outcome (strings cut at 300 characters), so one call is enough to decide. " +
      "mode is hybrid, or keyword when semantic search is unavailable. " +
      "Judgments the user has since revised are left out unless include_superseded is true; use it to see what a decision replaced. " +
      "How to choose the project: when you work in a repository, compare the repository name with repo_names from project_list, then with name. " +
      "Without a repository, compare the project name the user mentioned in the conversation with name. " +
      "When exactly one project fits, search it. When none or several fit, do not search: go on without it, do not ask the user and do not create a project. " +
      "Only when the user asked you to search, ask which project they mean.",
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
            "Search words, 1-200 characters. Space-separated words must all match in the keyword search.",
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
      required: ["project_id", "query"],
    },
  },
  handler: handleJudgmentSearch,
};
