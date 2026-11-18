import { ApiError } from "../services/api/client.js";
import type { ToolResult } from "../schemas/tool.js";

export class InvalidInputError extends Error {}

export function ok(data: unknown): ToolResult {
  const structuredContent =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : { result: data };
  return {
    structuredContent,
    content: [{ type: "text", text: JSON.stringify(data) }],
  };
}

export function failure(error: unknown): ToolResult {
  let code = "mcp_error";
  let message = error instanceof Error ? error.message : "Unknown error";
  let status: number | undefined;
  if (error instanceof ApiError) {
    code = error.code;
    status = error.status;
  } else if (error instanceof InvalidInputError) {
    code = "invalid_input";
  }
  return {
    structuredContent: {
      error: { code, message, ...(status ? { status } : {}) },
    },
    content: [{ type: "text", text: `[${code}] ${message}` }],
    isError: true,
  };
}

export async function run(fn: () => Promise<unknown>): Promise<ToolResult> {
  try {
    return ok(await fn());
  } catch (error) {
    return failure(error);
  }
}

export function requireString(
  args: Record<string, unknown> | undefined,
  key: string,
): string {
  const value = args?.[key];
  if (typeof value === "string" && value !== "") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  throw new InvalidInputError(`${key} is required`);
}

export function pick(
  args: Record<string, unknown> | undefined,
  keys: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (args && args[key] !== undefined) out[key] = args[key];
  }
  return out;
}
