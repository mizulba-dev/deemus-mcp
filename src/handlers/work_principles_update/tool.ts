import type { ToolHandler } from "../../schemas/tool.js";
import { handleWorkPrinciplesUpdate } from "./handler.js";

export const workPrinciplesUpdateTool: ToolHandler = {
  definition: {
    name: "work_principles_update",
    description:
      "Rewrite the title, body or area of one of the user's work principles, a candidate or an adopted one. Send only the fields to change; a field you leave out keeps its value. " +
      "Call it only when the user asked to rewrite it, never on your own judgment, and show the new wording to the user before calling. " +
      "work_principles_context cuts body at 300 characters, so do not send a body built from a cut one; write the whole body. " +
      "area groups the principle by one of the user's domain skills (kind domain in skill_list). Send it only when the user asked to change the area, and only a domain skill name the user has; any other name is rejected. " +
      "An area you send is kept as the user's choice. Deemus may reject an area for the user's own settings; then nothing changes, so tell the user the error as it is. " +
      "Returns the principle (id, title, body, status, area, evidence_ids). " +
      "Get principle ids from principles in the first work_principles_context response (without before_id).",
    inputSchema: {
      type: "object",
      properties: {
        principle_id: {
          type: "integer",
          description: "Id of the work principle to rewrite.",
        },
        title: {
          type: "string",
          description: "New title, 1-80 characters.",
        },
        body: {
          type: "string",
          description:
            "New body, up to 600 characters. An empty string clears it.",
        },
        area: {
          type: ["string", "null"],
          description:
            "Name of one of the user's domain skills to use as the area. An empty string or null clears it.",
        },
      },
      required: ["principle_id"],
    },
  },
  handler: handleWorkPrinciplesUpdate,
};
