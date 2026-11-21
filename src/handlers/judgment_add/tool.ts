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
      "1) Call project_context first and pick the workstream of each judgment from its list. " +
      "2) Reuse an existing workstream whenever it fits; create a new workstream only when none does, by sending workstream.name and workstream.summary. " +
      "3) Each result keeps the order of the input. If a result has status needs_workstream_choice, nothing was saved for it: choose one of its candidates (workstream.id) or send it again with workstream.create_new=true, and resend only that judgment. " +
      "4) When you cannot decide between candidates, ask the user. " +
      "5) When the record does not state the reason, leave the reason empty; never fill it in by guessing. " +
      "6) Do not write secrets (keys, tokens, passwords) or personal information. " +
      "7) If needs_workstream_choice comes with no candidates, or with reason similarity_unavailable, the server could not compare workstreams; sending the same request again usually returns the same result, so do not just retry. Pick a fitting workstream from the project_context list yourself and resend with its workstream.id, or resend with workstream.create_new=true when none fits. " +
      "8) To put several judgments into the same new workstream, send only the first one with the new workstream.name (with create_new=true if needed), then send the others with the workstream.id returned for it. Do not send create_new=true again with a reworded name; a different name creates a separate workstream (the exact same name reuses the existing one). " +
      "What to record: " +
      "a judgment is one decision in a specific situation that the user could explain to others in a minute; never a general lesson. " +
      "Skip trivial things such as typo fixes, requests to run a command, permission approvals and progress checks. " +
      "Choose involvement by who decided: self when the user rejected the AI's proposal, chose between options, set a constraint or caught a mistake; " +
      "adopted when the user accepted the AI's approach as it was; " +
      "delegated when the user had the AI build something on its own (one judgment for the whole task, with the AI's choices in ai_decisions). " +
      "Quote only the user's own words in evidence, never the AI's. " +
      "When recording again in the same conversation, send only judgments made since the last call; a reworded title is recorded as a separate judgment. " +
      "When the user reverses an earlier judgment, find it with judgment_search and put its id in supersedes of the new judgment; the saved result lists superseded_ids. " +
      "When the response has work_principles_hint, tell the user in one line that Deemus can sum up their work principles. " +
      "Results are independent per judgment: saved, needs_workstream_choice or invalid (see errors). Sending the same session_id and title again does not create a duplicate.",
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
              supersedes: {
                type: "array",
                maxItems: 10,
                items: { type: "integer" },
                description:
                  "Ids of earlier judgments of the same project that this judgment replaces because the user reversed them. Find them with judgment_search. Optional.",
              },
              workstream: {
                type: "object",
                description:
                  "Either {id} of an existing workstream from project_context, or {name, summary?, create_new?} for a workstream that is not in the list. " +
                  "summary is a one-sentence description of the workstream. create_new=true forces a new workstream even when similar ones exist.",
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
            required: ["title", "involvement", "detail", "workstream"],
          },
        },
      },
      required: ["project_id", "source", "judgments"],
    },
  },
  handler: handleJudgmentAdd,
};
