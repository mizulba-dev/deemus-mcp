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

const judgmentsBody = {
  source: { tool: "claude-code", session_id: "session-1" },
  judgments: [
    {
      title: "Retry failed payments",
      involvement: "self",
      detail: {
        situation: "Payments fail at random.",
        decision: "Retry up to three times.",
        reason: "",
      },
      feature: { name: "Payment retry", summary: "Retries failed payments." },
    },
  ],
};

const annotationCases = [
  { name: "project_list", readOnly: true, idempotent: true },
  { name: "project_create", readOnly: false, idempotent: true },
  { name: "project_context", readOnly: true, idempotent: true },
  { name: "judgment_add", readOnly: false, idempotent: true },
];

describe("tool definitions", () => {
  it("registers exactly the four tools in order", () => {
    expect(tools.map((t) => t.definition.name)).toEqual([
      "project_list",
      "project_create",
      "project_context",
      "judgment_add",
    ]);
  });

  it.each(annotationCases)(
    "annotates $name (readOnly=$readOnly, idempotent=$idempotent)",
    ({ name, readOnly, idempotent }) => {
      const { annotations } = byName(name).definition;
      expect(annotations?.readOnlyHint).toBe(readOnly);
      expect(annotations?.idempotentHint).toBe(idempotent);
      expect(annotations?.destructiveHint).toBe(false);
      expect(annotations?.openWorldHint).toBe(false);
    },
  );

  it("describes the rules of judgment_add", () => {
    const { description } = byName("judgment_add").definition;
    for (const phrase of [
      "project_context first",
      "existing feature",
      "needs_feature_choice",
      "ask the user",
      "leave the reason empty",
      "secrets",
      "no candidates, or with reason similarity_unavailable",
      "sending the same request again usually returns the same result",
      "send only the first one with the new feature.name",
      "the feature.id returned for it",
      "Do not send create_new=true again with a reworded name",
      "the exact same name reuses the existing one",
    ]) {
      expect(description).toContain(phrase);
    }
  });

  it("does not expose a public mark on judgment_add", () => {
    expect(JSON.stringify(byName("judgment_add").definition)).not.toContain(
      "public",
    );
  });
});

describe("validateArgs", () => {
  it("accepts empty arguments for project_list", () => {
    const def = byName("project_list").definition;
    expect(validateArgs(def, undefined)).toBeNull();
    expect(validateArgs(def, {})).toBeNull();
  });

  it("requires name for project_create", () => {
    const def = byName("project_create").definition;
    expect(validateArgs(def, {})).toBe("name is required");
    expect(validateArgs(def, { name: "Example Project" })).toBeNull();
  });

  it("requires project_id as an integer for project_context", () => {
    const def = byName("project_context").definition;
    expect(validateArgs(def, {})).toBe("project_id is required");
    expect(validateArgs(def, { project_id: "1" })).toBe(
      "project_id must be of type integer",
    );
    expect(validateArgs(def, { project_id: 1 })).toBeNull();
  });

  it("requires project_id, source and judgments for judgment_add", () => {
    const def = byName("judgment_add").definition;
    expect(validateArgs(def, { source: {}, judgments: [] })).toBe(
      "project_id is required",
    );
    expect(validateArgs(def, { project_id: 1, judgments: [] })).toBe(
      "source is required",
    );
    expect(validateArgs(def, { project_id: 1, source: {} })).toBe(
      "judgments is required",
    );
    expect(
      validateArgs(def, { project_id: 1, source: {}, judgments: {} }),
    ).toBe("judgments must be of type array");
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

  it("project_list -> GET /api/v1/mcp/projects", async () => {
    const client = createApiClient(api.url, "oat_t");

    const result = await byName("project_list").handler({}, client);

    expect(result.isError).toBeFalsy();
    expect(api.requests).toHaveLength(1);
    expect(api.requests[0].method).toBe("GET");
    expect(api.requests[0].path).toBe("/api/v1/mcp/projects");
    expect(api.requests[0].headers.authorization).toBe("Bearer oat_t");
  });

  it("project_create -> POST /api/v1/mcp/projects with the given fields only", async () => {
    const client = createApiClient(api.url, "oat_t");

    const result = await byName("project_create").handler(
      {
        name: "Example Project",
        repo_names: ["example-repo"],
        ignored: "x",
      },
      client,
    );

    expect(result.isError).toBeFalsy();
    expect(api.requests).toHaveLength(1);
    expect(api.requests[0].method).toBe("POST");
    expect(api.requests[0].path).toBe("/api/v1/mcp/projects");
    expect(api.requests[0].body).toEqual({
      name: "Example Project",
      repo_names: ["example-repo"],
    });
  });

  it("project_context -> GET /api/v1/mcp/projects/:id/context", async () => {
    const client = createApiClient(api.url, "oat_t");

    const result = await byName("project_context").handler(
      { project_id: 12 },
      client,
    );

    expect(result.isError).toBeFalsy();
    expect(api.requests).toHaveLength(1);
    expect(api.requests[0].method).toBe("GET");
    expect(api.requests[0].path).toBe("/api/v1/mcp/projects/12/context");
  });

  it("judgment_add -> POST /api/v1/mcp/projects/:id/judgments and returns results as is", async () => {
    const response = {
      results: [
        {
          status: "needs_feature_choice",
          reason: "similar_found",
          candidates: [
            { id: 3, name: "Payment retries", summary: "", score: 0.8 },
          ],
        },
      ],
    };
    api.respondWith(() => ({ body: response }));
    const client = createApiClient(api.url, "oat_t");

    const result = await byName("judgment_add").handler(
      { project_id: 12, ...judgmentsBody, ignored: "x" },
      client,
    );

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual(response);
    expect(api.requests).toHaveLength(1);
    expect(api.requests[0].method).toBe("POST");
    expect(api.requests[0].path).toBe("/api/v1/mcp/projects/12/judgments");
    expect(api.requests[0].body).toEqual(judgmentsBody);
  });

  it.each([
    ["project_context", {}],
    ["project_context", { project_id: "../session" }],
    ["project_context", { project_id: 0 }],
    ["judgment_add", { ...judgmentsBody }],
    ["judgment_add", { project_id: "1/../2", ...judgmentsBody }],
  ])("%s rejects a missing or malformed project_id %j", async (name, args) => {
    const client = createApiClient(api.url, "oat_t");

    const result = await byName(name).handler(args, client);

    expect(result.isError).toBe(true);
    expect(result.structuredContent?.error).toMatchObject({
      code: "invalid_input",
    });
    expect(api.requests).toHaveLength(0);
  });

  it("returns isError with the API error code and message", async () => {
    api.respondWith(() => ({
      status: 403,
      body: { error: "insufficient scope", code: "insufficient_scope" },
    }));
    const client = createApiClient(api.url, "oat_t");

    const result = await byName("project_list").handler({}, client);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      "[insufficient_scope] insufficient scope",
    );
    expect(result.structuredContent).toEqual({
      error: {
        code: "insufficient_scope",
        message: "insufficient scope",
        status: 403,
      },
    });
  });

  it("formats a not_found error from project_context", async () => {
    api.respondWith(() => ({
      status: 404,
      body: { error: "project not found", code: "not_found" },
    }));
    const client = createApiClient(api.url, "oat_t");

    const result = await byName("project_context").handler(
      { project_id: 99 },
      client,
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("[not_found] project not found");
    expect(result.structuredContent).toEqual({
      error: { code: "not_found", message: "project not found", status: 404 },
    });
  });

  it("formats an invalid_request error from judgment_add", async () => {
    api.respondWith(() => ({
      status: 400,
      body: {
        error: "judgments must have 1 to 20 items",
        code: "invalid_request",
      },
    }));
    const client = createApiClient(api.url, "oat_t");

    const result = await byName("judgment_add").handler(
      { project_id: 1, source: { tool: "claude-code" }, judgments: [] },
      client,
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      "[invalid_request] judgments must have 1 to 20 items",
    );
  });
});
