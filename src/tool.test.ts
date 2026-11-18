import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApiClient } from "./services/api/index.js";
import { getRegisteredTools, validateArgs } from "./tool.js";
import { startMockApi, type MockApi } from "./testing/mock-api.js";

const tools = getRegisteredTools();
const byName = (name: string) => {
  const tool = tools.find((t) => t.definition.name === name);
  if (!tool) throw new Error(`missing tool ${name}`);
  return tool;
};

describe("tool definitions", () => {
  it("registers exactly the example_list tool", () => {
    expect(tools.map((t) => t.definition.name)).toEqual(["example_list"]);
  });

  it("annotates example_list as read-only", () => {
    const { annotations } = byName("example_list").definition;
    expect(annotations?.readOnlyHint).toBe(true);
    expect(annotations?.destructiveHint).toBe(false);
    expect(annotations?.openWorldHint).toBe(false);
  });
});

describe("validateArgs", () => {
  it("accepts empty arguments for example_list", () => {
    const def = byName("example_list").definition;
    expect(validateArgs(def, undefined)).toBeNull();
    expect(validateArgs(def, {})).toBeNull();
  });
});

describe("tool to API mapping", () => {
  let api: MockApi;

  beforeEach(async () => {
    api = await startMockApi();
  });

  afterEach(async () => {
    await api.close();
  });

  it("example_list -> GET /api/v1/mcp/examples", async () => {
    const client = createApiClient(api.url, "oat_t");

    const result = await byName("example_list").handler({}, client);

    expect(result.isError).toBeFalsy();
    expect(api.requests).toHaveLength(1);
    expect(api.requests[0].method).toBe("GET");
    expect(api.requests[0].path).toBe("/api/v1/mcp/examples");
    expect(api.requests[0].headers.authorization).toBe("Bearer oat_t");
  });

  it("returns isError with the API error code and message", async () => {
    api.respondWith(() => ({
      status: 403,
      body: { error: "insufficient scope", code: "insufficient_scope" },
    }));
    const client = createApiClient(api.url, "oat_t");

    const result = await byName("example_list").handler({}, client);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("[insufficient_scope] insufficient scope");
    expect(result.structuredContent).toEqual({
      error: {
        code: "insufficient_scope",
        message: "insufficient scope",
        status: 403,
      },
    });
  });
});
