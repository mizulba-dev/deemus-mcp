import type { ToolHandler } from "../../schemas/tool.js";
import { DETAIL_PROPERTIES, SCOPE_PROPERTY } from "../judgment_add/tool.js";
import { handleJudgmentUpdate } from "./handler.js";

export const judgmentUpdateTool: ToolHandler = {
  definition: {
    name: "judgment_update",
    description:
      "Fix or add to a judgment that is already recorded: the title, fields of detail, evidence, skills, the workstream (also in another project), the outcome, the user's reason, the scope, or the judgment that replaced it. " +
      "Send only what the user said; never fill outcome or reason in by guessing. Send at least one field. " +
      "title replaces the title (1-80 characters). " +
      "detail changes only the keys you send, within the keys of the judgment's current involvement (the same keys and limits as judgment_add); keys you leave out keep their values. reason and own_reason cannot be sent in detail; send the user's reason as reason. options and ai_decisions replace the whole list, so send every item you want to keep. " +
      "evidence replaces all quotes (up to 3, each 1-200 characters, the user's own words only); send [] to remove them. " +
      "outcome and reason replace the current value (1-2000 characters) and cannot be emptied here. " +
      "reason is the user's own reason: it is saved as reason for a self judgment and as own_reason for an adopted one, and is rejected for a delegated one. " +
      "scope sets direction or local as the user's own correction (scope_by_user becomes true); judgment_scope_set never overwrites it, and it cannot be cleared. Send it only when the user asked. " +
      "superseded_by_id is the id of the judgment that replaced this one, from the same project and not itself revised; send null to undo it. " +
      "skills replaces the tech names, the domain names, or both: a kind you leave out keeps its names, and [] removes that kind. Use names from project_context; a tech name not in the list is kept as a suggestion. " +
      "workstream moves the judgment: send {id} of any workstream of the user (it may belong to another project), or {project_id, name, summary} to use the workstream with exactly that name in that project and create it when there is none (project_id defaults to the judgment's current project). If the judgment was moved by another request meanwhile, the call is rejected; read it again with judgment_get. " +
      "Moving to another project removes the judgment's links of superseded_by_id in both directions; superseded_by_id cannot be sent in the same call. " +
      "The response is the updated judgment in the same shape as judgment_get, so you can check every field. " +
      "Get judgment ids from judgment_search or from the judgment_add response.",
    inputSchema: {
      type: "object",
      properties: {
        judgment_id: {
          type: "integer",
          description: "Id of the judgment to update.",
        },
        title: {
          type: "string",
          description: "New title, 1-80 characters.",
        },
        detail: {
          type: "object",
          description:
            "Fields of detail to change. Only the keys sent are replaced; they must belong to the judgment's involvement.",
          properties: DETAIL_PROPERTIES,
        },
        evidence: {
          type: "array",
          maxItems: 3,
          items: { type: "string" },
          description:
            "Quotes of the user's own words that replace the current ones, each 1-200 characters. [] removes them.",
        },
        skills: {
          type: "object",
          description:
            "Skill names that replace the current ones, per kind. A kind you leave out is kept.",
          properties: {
            tech: { type: "array", items: { type: "string" } },
            domain: { type: "array", items: { type: "string" } },
          },
        },
        workstream: {
          type: "object",
          description:
            "Where to move the judgment: {id} or {project_id, name, summary}.",
          properties: {
            id: { type: "integer" },
            project_id: { type: "integer" },
            name: { type: "string" },
            summary: { type: "string" },
          },
        },
        outcome: {
          type: "string",
          description: "What came of it, 1-2000 characters.",
        },
        reason: {
          type: "string",
          description: "The user's own reason, 1-2000 characters.",
        },
        scope: SCOPE_PROPERTY,
        superseded_by_id: {
          type: ["integer", "null"],
          description:
            "Id of the judgment that replaced this one. null clears it.",
        },
      },
      required: ["judgment_id"],
    },
  },
  handler: handleJudgmentUpdate,
};
