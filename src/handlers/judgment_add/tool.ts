import type { ToolHandler } from "../../schemas/tool.js";
import { handleJudgmentAdd } from "./handler.js";

const DETAIL_DESCRIPTION =
  "Content of the judgment. Keys depend on involvement; keys that do not belong to it are rejected. Every string is up to 2000 characters and required keys must not be blank. " +
  "self: situation (required), decision (required), options (up to 6 items of {label, by_ai, adopted}; label 1-300 characters, by_ai true when the AI proposed the option, adopted true for the option the user chose), reason (optional), hard_part (optional). " +
  "adopted: situation (required), ai_proposal (required), ai_reason (optional), own_reason (optional). " +
  "delegated: request (required), why_needed (optional), conditions (optional), verified (optional), ai_decisions (up to 10 strings of 1-300 characters). " +
  "Leave an optional key empty or omit it when the record does not state it.";

export const judgmentAddTool: ToolHandler = {
  definition: {
    name: "judgment_add",
    description:
      "Record judgments the user made while building with AI, up to 20 per call, for one project. " +
      "Rules: " +
      "1) Call project_context first and pick the feature of each judgment from its list. " +
      "2) Reuse an existing feature whenever it fits; create a new feature only when none does, by sending feature.name and feature.summary. " +
      "3) Each result keeps the order of the input. If a result has status needs_feature_choice, nothing was saved for it: choose one of its candidates (feature.id) or send it again with feature.create_new=true, and resend only that judgment. " +
      "4) When you cannot decide between candidates, ask the user. " +
      "5) When the record does not state the reason, leave the reason empty; never fill it in by guessing. " +
      "6) Do not write secrets (keys, tokens, passwords) or personal information. " +
      "Results are independent per judgment: saved, needs_feature_choice or invalid (see errors). Sending the same session_id and title again does not create a duplicate.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "integer",
          description: "Project id from project_list or project_create.",
        },
        source: {
          type: "object",
          description:
            "Where the judgments come from. session_id lets a resend of the same judgment be recognized.",
          properties: {
            tool: {
              type: "string",
              description:
                "Name of the work environment, e.g. claude-code (up to 40 characters).",
            },
            session_id: {
              type: "string",
              description:
                "Session identifier (up to 100 characters). Optional.",
            },
          },
          required: ["tool"],
        },
        judgments: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          description: "1 to 20 judgments.",
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Short title of the judgment, 1-80 characters.",
              },
              involvement: {
                type: "string",
                enum: ["self", "adopted", "delegated"],
                description:
                  "self: the user decided. adopted: the user adopted a proposal from the AI. delegated: the user handed the work to the AI.",
              },
              detail: {
                type: "object",
                description: DETAIL_DESCRIPTION,
                properties: {
                  situation: { type: "string" },
                  options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        by_ai: { type: "boolean" },
                        adopted: { type: "boolean" },
                      },
                      required: ["label"],
                    },
                  },
                  decision: { type: "string" },
                  reason: { type: "string" },
                  hard_part: { type: "string" },
                  ai_proposal: { type: "string" },
                  ai_reason: { type: "string" },
                  own_reason: { type: "string" },
                  request: { type: "string" },
                  why_needed: { type: "string" },
                  conditions: { type: "string" },
                  verified: { type: "string" },
                  ai_decisions: { type: "array", items: { type: "string" } },
                },
              },
              outcome: {
                type: "string",
                description:
                  "What came of it, up to 2000 characters. Optional.",
              },
              evidence: {
                type: "array",
                maxItems: 3,
                items: { type: "string" },
                description:
                  "Up to 3 short quotes from the record that support the judgment, each 1-200 characters. Optional.",
              },
              decided_on: {
                type: "string",
                description: "Date of the judgment as YYYY-MM-DD. Optional.",
              },
              skills: {
                type: "object",
                description:
                  "Skill names, matched exactly against the names returned by project_context. Optional.",
                properties: {
                  tech: { type: "array", items: { type: "string" } },
                  domain: { type: "array", items: { type: "string" } },
                },
              },
              feature: {
                type: "object",
                description:
                  "Either {id} of an existing feature from project_context, or {name, summary?, create_new?} for a feature that is not in the list. " +
                  "summary is a one-sentence description of the feature. create_new=true forces a new feature even when similar ones exist.",
                properties: {
                  id: { type: "integer" },
                  name: { type: "string", description: "1-80 characters." },
                  summary: {
                    type: "string",
                    description: "Up to 200 characters.",
                  },
                  create_new: { type: "boolean" },
                },
              },
            },
            required: ["title", "involvement", "detail", "feature"],
          },
        },
      },
      required: ["project_id", "source", "judgments"],
    },
  },
  handler: handleJudgmentAdd,
};
