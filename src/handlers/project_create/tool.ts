import type { ToolHandler } from "../../schemas/tool.js";
import { handleProjectCreate } from "./handler.js";

export const projectCreateTool: ToolHandler = {
  definition: {
    name: "project_create",
    description:
      "Create a project. Call project_list first and create one only when no existing project matches. " +
      "If a project with the same name already exists, it is returned unchanged with created=false.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Project name, 1-100 characters.",
        },
        summary: {
          type: "string",
          description:
            "One or two sentences about the project, up to 1000 characters.",
        },
        repo_names: {
          type: "array",
          items: { type: "string" },
          description:
            "Repository names that belong to this project (up to 10, each 1-100 characters). Used to match the project later.",
        },
      },
      required: ["name"],
    },
  },
  handler: handleProjectCreate,
};
