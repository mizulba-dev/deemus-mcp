import type { ToolHandler } from "../../schemas/tool.js";
import { handleWorkPrinciplesDiscard } from "./handler.js";

export const workPrinciplesDiscardTool: ToolHandler = {
  definition: {
    name: "work_principles_discard",
    description:
      "Delete one of the user's work principles, a candidate or an adopted one, for example to clear old candidates before summing up again. " +
      "Call it only when the user asked to drop or delete it, never on your own judgment, and name the principle (title and id) before calling. " +
      "This cannot be undone. The judgments it was based on stay recorded. " +
      "If it was an adopted principle the user chose to show to other people, it disappears from what others see the next time the user updates that page in Deemus. " +
      "Get principle ids from principles in the first work_principles_context response (without before_id).",
    inputSchema: {
      type: "object",
      properties: {
        principle_id: {
          type: "integer",
          description: "Id of the work principle to delete.",
        },
      },
      required: ["principle_id"],
    },
  },
  handler: handleWorkPrinciplesDiscard,
};
