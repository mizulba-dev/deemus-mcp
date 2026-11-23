import type { ToolHandler } from "../../schemas/tool.js";
import { handleWorkPrinciplesPropose } from "./handler.js";

export const workPrinciplesProposeTool: ToolHandler = {
  definition: {
    name: "work_principles_propose",
    description:
      "Send candidates for the user's work principles: criteria that run through judgments made in different situations. The user adopts them in Deemus and may choose to show adopted ones to other people, so write them for that reader; nothing is shown to others by this call. " +
      "Rules: " +
      "1) Call work_principles_context first and use only judgment ids it returned. " +
      "2) Send 0 to 5 candidates. Each needs a title (1-80 characters), a body (up to 600 characters, may be empty) and evidence_ids (2 to 10 judgment ids). " +
      "When no candidate qualifies, call with candidates empty: this records the time of the last proposal and stops the reminder to sum up. " +
      "3) Write each criterion so the trade-off and the purpose it serves can be read, in a form such as 'to X, prioritize A over B' or 'when ..., choose ...'. In the body, give the premise (the kind of situation, such as personal or work projects) and the purpose before what was given up, writing the premise only from what the judgments show, so that a reader who does not know the user's circumstances does not read it as cutting corners. Send criteria that serve the same purpose as one candidate. " +
      "4) Each criterion must be backed by at least 2 judgments from different situations; never rephrase a single judgment, and never write a general lesson such as 'think carefully'. " +
      "Do not propose how to operate or instruct the AI, rules the user has to follow, or confirmation procedures and checklists. " +
      "5) Do not propose what the user already has in principles. " +
      "6) Results are independent per candidate and keep the order of the input: saved, duplicate (the same title already exists; nothing saved) or invalid (see errors). " +
      "Deemus sets the area of each saved candidate from the domain skills of its evidence judgments; do not send one. " +
      "7) Do not write secrets (keys, tokens, passwords) or personal information.",
    inputSchema: {
      type: "object",
      properties: {
        candidates: {
          type: "array",
          maxItems: 5,
          description:
            "0 to 5 candidates. Send an empty array when none qualifies.",
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "The criterion in one line, 1-80 characters.",
              },
              body: {
                type: "string",
                description:
                  "A short explanation of the criterion, up to 600 characters. Optional.",
              },
              evidence_ids: {
                type: "array",
                minItems: 2,
                maxItems: 10,
                items: { type: "integer" },
                description:
                  "Ids of 2 to 10 judgments from work_principles_context that show this criterion.",
              },
            },
            required: ["title", "evidence_ids"],
          },
        },
      },
      required: ["candidates"],
    },
  },
  handler: handleWorkPrinciplesPropose,
};
