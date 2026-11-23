import type { ToolHandler } from "../../schemas/tool.js";
import { handleWorkPrinciplesAdopt } from "./handler.js";

export const workPrinciplesAdoptTool: ToolHandler = {
  definition: {
    name: "work_principles_adopt",
    description:
      "Adopt a candidate work principle, placing it after the user's adopted ones. " +
      "Call it only when the user asked to adopt it, never on your own judgment, and name the candidate (title and id) before calling. " +
      "To reword it as you adopt it, send title and body with this call instead of calling work_principles_update first; a field you leave out keeps its value. " +
      "When it cannot be adopted, nothing changes, the wording included. " +
      "An adopted principle returns a conflict error; a candidate with fewer than 2 judgments still recorded as its evidence returns invalid_request. " +
      "Returns the principle (id, title, body, status, evidence_ids). " +
      "Get principle ids from principles in the first work_principles_context response (without before_id).",
    inputSchema: {
      type: "object",
      properties: {
        principle_id: {
          type: "integer",
          description: "Id of the candidate to adopt.",
        },
        title: {
          type: "string",
          description: "New title, 1-80 characters. Optional.",
        },
        body: {
          type: "string",
          description:
            "New body, up to 600 characters. An empty string clears it. Optional.",
        },
      },
      required: ["principle_id"],
    },
  },
  handler: handleWorkPrinciplesAdopt,
};
