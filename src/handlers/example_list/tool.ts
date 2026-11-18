import type { ToolHandler } from "../../schemas/tool.js";
import { handleExampleList } from "./handler.js";

export const exampleListTool: ToolHandler = {
  definition: {
    name: "example_list",
    description: "List the user's examples.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  handler: handleExampleList,
};
