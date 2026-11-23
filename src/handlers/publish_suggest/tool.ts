import type { ToolHandler } from "../../schemas/tool.js";
import { handlePublishSuggest } from "./handler.js";

export const publishSuggestTool: ToolHandler = {
  definition: {
    name: "publish_suggest",
    description:
      "Send suggestions of which judgments and projects to show on the user's page. The user adopts or turns down each one in Deemus; this call changes no mark and shows nothing. " +
      "Rules: " +
      "1) Call it only when the user asked you to suggest what to show, never after recording or on your own. " +
      "2) Call publish_context first, read every page, and use only ids it returned. " +
      "3) Send everything in one call: up to 50 judgments and up to 20 projects. Suggestions from an earlier call that the user has not decided on are replaced by this call, so do not split them across calls. " +
      "4) Each item needs an id and a reason of 1 to 200 characters, one sentence taken from what the record says. Do not guess a reason and do not write a reason for the user. " +
      "For a judgment, set highlight to true to also suggest it as a highlight of its project (at most 3 per project, counting those already highlighted). " +
      "5) Do not send a judgment or project whose previously is dismissed, one that is already shown or highlighted, or a project of kind work; the server skips them. " +
      "6) Results keep the order of the input: saved, skipped (skip_reason: work_project, superseded, local_or_delegated, already_shown, dismissed_before or project_already_shown) or invalid (see errors). " +
      "Also returns pending_count, the number of suggestions waiting for the user. " +
      "7) Do not write secrets (keys, tokens, passwords) or personal information, or names of people or customers.",
    inputSchema: {
      type: "object",
      properties: {
        judgments: {
          type: "array",
          maxItems: 50,
          description: "Judgments to suggest. Send an empty array for none.",
          items: {
            type: "object",
            properties: {
              id: {
                type: "integer",
                description: "Judgment id from publish_context.",
              },
              highlight: {
                type: "boolean",
                description:
                  "true to also suggest it as a highlight of its project.",
              },
              reason: {
                type: "string",
                description:
                  "Why it is worth showing, 1-200 characters, from what the record says.",
              },
            },
            required: ["id", "reason"],
          },
        },
        projects: {
          type: "array",
          maxItems: 20,
          description: "Projects to suggest. Send an empty array for none.",
          items: {
            type: "object",
            properties: {
              id: {
                type: "integer",
                description: "Project id from publish_context.",
              },
              reason: {
                type: "string",
                description:
                  "Why it is worth showing, 1-200 characters, from what the record says.",
              },
            },
            required: ["id", "reason"],
          },
        },
      },
      required: ["judgments", "projects"],
    },
  },
  handler: handlePublishSuggest,
};
