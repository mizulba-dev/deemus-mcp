import type { ApiClient } from "../services/api/client.js";

export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ToolDefinition {
  name: string;
  title?: string;
  description: string;
  annotations?: ToolAnnotations;
  _meta?: Record<string, unknown>;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// SDK の CallToolRequest ハンドラは戻り値にインデックスシグネチャを要求するため、
// 独自の追加プロパティを許すオープンな型にする。
export interface ToolResult {
  [key: string]: unknown;
  structuredContent?: Record<string, unknown>;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export type ToolHandlerFn = (
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) => Promise<ToolResult>;

export interface ToolHandler {
  definition: ToolDefinition;
  handler: ToolHandlerFn;
}
