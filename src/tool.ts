import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { createApiClient } from "./services/api/index.js";
import {
  judgmentAddTool,
  judgmentSearchTool,
  judgmentUpdateTool,
  projectContextTool,
  projectCreateTool,
  projectListTool,
  projectMergeTool,
  workPrinciplesContextTool,
  workPrinciplesProposeTool,
} from "./handlers/index.js";
import { InvalidInputError, failure } from "./handlers/common.js";
import type { ToolDefinition, ToolHandler } from "./schemas/tool.js";

const READ_ONLY_TOOLS = new Set([
  "project_list",
  "project_context",
  "judgment_search",
  "work_principles_context",
]);
const DESTRUCTIVE_TOOLS = new Set<string>(["project_merge", "judgment_update"]);
const IDEMPOTENT_TOOLS = new Set([
  "project_create",
  "judgment_add",
  "judgment_update",
]);

const TOOL_TITLES: Record<string, string> = {
  project_list: "List projects",
  project_create: "Create a project",
  project_context: "Get project context",
  project_merge: "Merge projects",
  judgment_add: "Add judgments",
  judgment_search: "Search judgments",
  judgment_update: "Update a judgment",
  work_principles_context: "Get work principles context",
  work_principles_propose: "Propose work principles",
};

function withToolAnnotations(tool: ToolHandler): ToolHandler {
  const name = tool.definition.name;
  const readOnly = READ_ONLY_TOOLS.has(name);
  const title = TOOL_TITLES[name] ?? name;
  return {
    ...tool,
    definition: {
      ...tool.definition,
      title,
      annotations: {
        ...tool.definition.annotations,
        title,
        readOnlyHint: readOnly,
        destructiveHint: readOnly ? false : DESTRUCTIVE_TOOLS.has(name),
        idempotentHint: readOnly || IDEMPOTENT_TOOLS.has(name),
        openWorldHint: false,
      },
    },
  };
}

export function getRegisteredTools(): ToolHandler[] {
  return [
    projectListTool,
    projectCreateTool,
    projectContextTool,
    projectMergeTool,
    judgmentAddTool,
    judgmentSearchTool,
    judgmentUpdateTool,
    workPrinciplesContextTool,
    workPrinciplesProposeTool,
  ].map(withToolAnnotations);
}

function matchesType(type: unknown, value: unknown): boolean {
  if (Array.isArray(type)) return type.some((t) => matchesType(t, value));
  switch (type) {
    case "string":
      return typeof value === "string";
    case "integer":
      return Number.isInteger(value);
    case "number":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    case "array":
      return Array.isArray(value);
    case "object":
      return (
        typeof value === "object" && value !== null && !Array.isArray(value)
      );
    default:
      return true;
  }
}

export function validateArgs(
  definition: ToolDefinition,
  args: Record<string, unknown> | undefined,
): string | null {
  const input = args ?? {};
  for (const key of definition.inputSchema.required ?? []) {
    if (input[key] === undefined || input[key] === null) {
      return `${key} is required`;
    }
  }
  for (const [key, schema] of Object.entries(
    definition.inputSchema.properties,
  )) {
    const value = input[key];
    if (value === undefined) continue;
    const type = (schema as { type?: unknown }).type;
    if (!matchesType(type, value)) {
      return `${key} must be of type ${String(type)}`;
    }
  }
  return null;
}

export function setupTool(
  server: Server,
  apiUrl: string,
  accessToken?: string,
  onUnauthorized?: () => void,
): void {
  const apiClient = createApiClient(apiUrl, accessToken);
  const tools = getRegisteredTools();

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => tool.definition),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((t) => t.definition.name === request.params.name);

    if (!tool) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Unknown tool: ${request.params.name}`,
      );
    }

    const invalid = validateArgs(tool.definition, request.params.arguments);
    if (invalid) return failure(new InvalidInputError(invalid));

    const result = await tool.handler(request.params.arguments, apiClient);
    const error = result.structuredContent?.error as
      { status?: number } | undefined;
    if (result.isError && error?.status === 401) onUnauthorized?.();
    return result;
  });
}
