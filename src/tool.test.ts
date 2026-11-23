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
      workstream: {
        name: "Payment retry",
        summary: "Retries failed payments.",
      },
    },
  ],
};

const annotationCases = [
  { name: "skill_list", readOnly: true, idempotent: true, destructive: false },
  { name: "skill_add", readOnly: false, idempotent: true, destructive: false },
  {
    name: "skill_update",
    readOnly: false,
    idempotent: true,
    destructive: false,
  },
  {
    name: "skill_merge",
    readOnly: false,
    idempotent: false,
    destructive: true,
  },
  {
    name: "skill_suggestion_discard",
    readOnly: false,
    idempotent: true,
    destructive: true,
  },
  {
    name: "project_update",
    readOnly: false,
    idempotent: true,
    destructive: false,
  },
  {
    name: "project_delete",
    readOnly: false,
    idempotent: true,
    destructive: true,
  },
  {
    name: "workstream_update",
    readOnly: false,
    idempotent: true,
    destructive: false,
  },
  {
    name: "workstream_merge",
    readOnly: false,
    idempotent: false,
    destructive: true,
  },
  {
    name: "judgment_get",
    readOnly: true,
    idempotent: true,
    destructive: false,
  },
  {
    name: "project_list",
    readOnly: true,
    idempotent: true,
    destructive: false,
  },
  {
    name: "project_create",
    readOnly: false,
    idempotent: true,
    destructive: false,
  },
  {
    name: "project_context",
    readOnly: true,
    idempotent: true,
    destructive: false,
  },
  {
    name: "project_merge",
    readOnly: false,
    idempotent: false,
    destructive: true,
  },
  {
    name: "judgment_add",
    readOnly: false,
    idempotent: true,
    destructive: false,
  },
  {
    name: "judgment_search",
    readOnly: true,
    idempotent: true,
    destructive: false,
  },
  {
    name: "judgment_update",
    readOnly: false,
    idempotent: true,
    destructive: true,
  },
  {
    name: "judgment_discard",
    readOnly: false,
    idempotent: true,
    destructive: true,
  },
  {
    name: "judgment_scope_list",
    readOnly: true,
    idempotent: true,
    destructive: false,
  },
  {
    name: "judgment_scope_set",
    readOnly: false,
    idempotent: true,
    destructive: false,
  },
  {
    name: "work_principles_context",
    readOnly: true,
    idempotent: true,
    destructive: false,
  },
  {
    name: "work_principles_propose",
    readOnly: false,
    idempotent: false,
    destructive: false,
  },
  {
    name: "work_principles_update",
    readOnly: false,
    idempotent: true,
    destructive: true,
  },
  {
    name: "work_principles_adopt",
    readOnly: false,
    idempotent: false,
    destructive: false,
  },
  {
    name: "work_principles_discard",
    readOnly: false,
    idempotent: true,
    destructive: true,
  },
];

describe("tool definitions", () => {
  it("registers exactly the twenty-five tools in order", () => {
    expect(tools.map((t) => t.definition.name)).toEqual([
      "project_list",
      "project_create",
      "project_context",
      "project_update",
      "project_merge",
      "project_delete",
      "workstream_update",
      "workstream_merge",
      "judgment_add",
      "judgment_search",
      "judgment_get",
      "judgment_update",
      "judgment_discard",
      "judgment_scope_list",
      "judgment_scope_set",
      "skill_list",
      "skill_add",
      "skill_update",
      "skill_merge",
      "skill_suggestion_discard",
      "work_principles_context",
      "work_principles_propose",
      "work_principles_update",
      "work_principles_adopt",
      "work_principles_discard",
    ]);
  });

  it.each(annotationCases)(
    "annotates $name (readOnly=$readOnly, idempotent=$idempotent, destructive=$destructive)",
    ({ name, readOnly, idempotent, destructive }) => {
      const { annotations } = byName(name).definition;
      expect(annotations?.readOnlyHint).toBe(readOnly);
      expect(annotations?.idempotentHint).toBe(idempotent);
      expect(annotations?.destructiveHint).toBe(destructive);
      expect(annotations?.openWorldHint).toBe(false);
    },
  );

  it("describes the rules of judgment_add", () => {
    const { description } = byName("judgment_add").definition;
    for (const phrase of [
      "project_context first",
      "existing workstream",
      "needs_workstream_choice",
      "ask the user",
      "leave the reason empty",
      "secrets",
      "no candidates, or with reason similarity_unavailable",
      "sending the same request again usually returns the same result",
      "send only the first one with the new workstream.name",
      "the workstream.id returned for it",
      "Do not send create_new=true again with a reworded name",
      "the exact same name reuses the existing one",
      "one decision in a specific situation",
      "Skip trivial things",
      "self when the user rejected the AI's proposal",
      "adopted when the user accepted the AI's approach as it was",
      "one judgment for the whole task, with the AI's choices in ai_decisions",
      "never the AI's",
      "send only judgments made since the last call",
      "work_principles_hint",
    ]) {
      expect(description).toContain(phrase);
    }
  });

  it("describes the rules of the editing tools", () => {
    const expectations: Record<string, string[]> = {
      project_delete: ["discarded ones included", "asked to delete it"],
      skill_add: [
        "only when the user asked to add that name",
        "linked_judgments",
      ],
      skill_merge: ["cannot be undone", "asked to merge"],
      skill_suggestion_discard: ["decided not to add that name"],
      workstream_merge: ["cannot be undone", "asked to merge"],
      project_update: ["do not invent one"],
      judgment_get: ["every field"],
      judgment_update: [
        "a kind you leave out keeps its names",
        "may belong to another project",
        "same shape as judgment_get",
      ],
      judgment_search: ["session_id narrows the results"],
      judgment_add: ["daily_remaining", "retry_at"],
    };
    for (const [name, phrases] of Object.entries(expectations)) {
      const { description } = byName(name).definition;
      for (const phrase of phrases) {
        expect(description, name).toContain(phrase);
      }
    }
  });

  it("describes the rules of judgment_discard", () => {
    const { description } = byName("judgment_discard").definition;
    for (const phrase of [
      "only when the user asked to discard it",
      "is not recorded again",
    ]) {
      expect(description).toContain(phrase);
    }
  });

  it("describes the rules of project_merge", () => {
    const { description } = byName("project_merge").definition;
    for (const phrase of [
      "cannot be undone",
      "get the user's confirmation",
      "exactly the same name",
    ]) {
      expect(description).toContain(phrase);
    }
  });

  it("describes the judgments work_principles_context returns", () => {
    const { description } = byName("work_principles_context").definition;
    for (const phrase of [
      "judgments that set a direction",
      "delegated judgments",
      "scope local",
      "neither options nor a reason",
      "decision (",
      "rejected_options (",
      "next_before_id",
      "up to 50 per call",
      "Only the first call (without before_id)",
      "project_kind (work or personal)",
      "later calls leave principles out",
      "area (the name of the domain skill it is grouped by, or null)",
    ]) {
      expect(description).toContain(phrase);
    }
  });

  it("describes the rules of work_principles_propose", () => {
    const { description } = byName("work_principles_propose").definition;
    for (const phrase of [
      "work_principles_context first",
      "0 to 5 candidates",
      "candidates empty",
      "2 to 10 judgment ids",
      "show adopted ones to other people",
      "the purpose it serves",
      "premise",
      "cutting corners",
      "same purpose as one candidate",
      "premise only from what the judgments show",
      "prioritize A over B",
      "when ..., choose ...",
      "how to operate or instruct the AI",
      "confirmation procedures and checklists",
      "at least 2 judgments from different situations",
      "never rephrase a single judgment",
      "general lesson",
      "already has",
      "duplicate",
      "invalid",
      "secrets",
      "Deemus sets the area of each saved candidate",
      "do not send one",
    ]) {
      expect(description).toContain(phrase);
    }
  });

  it("describes the rules of the work principle editing tools", () => {
    const expectations: Record<string, string[]> = {
      work_principles_update: [
        "only when the user asked to rewrite it",
        "never on your own judgment",
        "a field you leave out keeps its value",
        "cuts body at 300 characters",
        "first work_principles_context response",
        "only when the user asked to change the area",
        "only a domain skill name the user has",
        "nothing changes, so tell the user the error",
      ],
      work_principles_adopt: [
        "only when the user asked to adopt it",
        "never on your own judgment",
        "send title and body with this call",
        "a field you leave out keeps its value",
        "nothing changes, the wording included",
        "conflict",
        "first work_principles_context response",
      ],
      work_principles_discard: [
        "only when the user asked to drop or delete it",
        "never on your own judgment",
        "cannot be undone",
        "the next time the user updates that page",
        "first work_principles_context response",
      ],
    };
    for (const [name, phrases] of Object.entries(expectations)) {
      const { description, inputSchema } = byName(name).definition;
      expect(inputSchema.required, name).toEqual(["principle_id"]);
      for (const phrase of phrases) {
        expect(description, name).toContain(phrase);
      }
    }
  });

  it("describes judgment_search and judgment_update", () => {
    const search = byName("judgment_search").definition.description;
    for (const phrase of [
      "automatically only when you work inside a repository",
      "before you propose a design",
      "repo_names",
      "do not search",
      "do not ask the user",
      "do not create a project",
      "Without a repository, call it only when the user asked you",
      "ask which project they mean",
      "When the user asked you to search and none or several fit, ask which project they mean",
      "include_superseded",
    ]) {
      expect(search).toContain(phrase);
    }
    const update = byName("judgment_update").definition.description;
    for (const phrase of [
      "never fill outcome or reason in by guessing",
      "title replaces the title",
      "keys you leave out keep their values",
      "reason and own_reason cannot be sent in detail",
      "send [] to remove them",
      "own_reason",
      "delegated",
      "send null to undo it",
    ]) {
      expect(update).toContain(phrase);
    }
    expect(byName("judgment_add").definition.description).toContain(
      "judgment_search",
    );
  });

  it("exposes supersedes on each judgment of judgment_add", () => {
    const schema = byName("judgment_add").definition.inputSchema as {
      properties: {
        judgments: {
          items: { properties: { supersedes: { maxItems: number } } };
        };
      };
    };
    expect(
      schema.properties.judgments.items.properties.supersedes.maxItems,
    ).toBe(10);
  });

  it("exposes scope as direction or local on judgment_add and judgment_update", () => {
    const add = byName("judgment_add").definition.inputSchema as {
      properties: {
        judgments: {
          items: { properties: { scope: { enum: string[] } } };
        };
      };
    };
    expect(add.properties.judgments.items.properties.scope.enum).toEqual([
      "direction",
      "local",
    ]);
    const update = byName("judgment_update").definition.inputSchema
      .properties as { scope: { type: string; enum: string[] } };
    expect(update.scope).toMatchObject({
      type: "string",
      enum: ["direction", "local"],
    });
    expect(byName("judgment_add").definition.description).toContain(
      "if unsure, direction",
    );
    expect(byName("judgment_update").definition.description).toContain(
      "judgment_scope_set never overwrites it",
    );
    for (const name of ["judgment_get", "judgment_search"]) {
      expect(byName(name).definition.description, name).toContain(
        "scope_by_user",
      );
    }
  });

  it("describes judgment_scope_list and judgment_scope_set", () => {
    const list = byName("judgment_scope_list").definition;
    expect(list.inputSchema.required).toEqual(["project_id"]);
    expect(list.description).toContain("next_before_id");
    expect(list.description).toContain("only when the user asked");
    const set = byName("judgment_scope_set").definition;
    expect(set.inputSchema.required).toEqual(["items"]);
    expect(
      (set.inputSchema.properties.items as { maxItems: number }).maxItems,
    ).toBe(100);
    expect(set.description).toContain("skipped_user_set");
    expect(set.description).toContain("only when the user asked");
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

  it("exposes workstream as the required grouping of each judgment", () => {
    const schema = byName("judgment_add").definition.inputSchema as {
      properties: {
        judgments: {
          items: {
            properties: Record<string, { properties?: object }>;
            required: string[];
          };
        };
      };
    };
    const item = schema.properties.judgments.items;
    expect(item.required).toContain("workstream");
    expect(Object.keys(item.properties.workstream.properties ?? {})).toEqual([
      "id",
      "name",
      "summary",
      "create_new",
    ]);
  });

  it("does not mention public in any tool definition", () => {
    for (const tool of tools) {
      expect(JSON.stringify(tool.definition)).not.toMatch(/public/i);
    }
  });

  it("does not mention the old name feature in any tool definition", () => {
    for (const tool of tools) {
      expect(JSON.stringify(tool.definition)).not.toMatch(/feature/i);
    }
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
          status: "needs_workstream_choice",
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
    ["judgment_search", { query: "a" }],
    ["judgment_update", { judgment_id: "../4", outcome: "x" }],
  ])("%s rejects a missing or malformed project_id %j", async (name, args) => {
    const client = createApiClient(api.url, "oat_t");

    const result = await byName(name).handler(args, client);

    expect(result.isError).toBe(true);
    expect(result.structuredContent?.error).toMatchObject({
      code: "invalid_input",
    });
    expect(api.requests).toHaveLength(0);
  });

  it("judgment_search -> POST /api/v1/mcp/projects/:id/judgments/search with the search fields only", async () => {
    const response = { mode: "keyword", results: [] };
    api.respondWith(() => ({ body: response }));
    const client = createApiClient(api.url, "oat_t");

    const result = await byName("judgment_search").handler(
      {
        project_id: 12,
        query: "retry",
        include_superseded: true,
        limit: 5,
        ignored: "x",
      },
      client,
    );

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual(response);
    expect(api.requests[0].method).toBe("POST");
    expect(api.requests[0].path).toBe(
      "/api/v1/mcp/projects/12/judgments/search",
    );
    expect(api.requests[0].body).toEqual({
      query: "retry",
      include_superseded: true,
      limit: 5,
    });
  });

  it("judgment_update -> PATCH /api/v1/mcp/judgments/:id and sends null as is", async () => {
    api.respondWith(() => ({ body: { judgment: { id: 4 } } }));
    const client = createApiClient(api.url, "oat_t");

    const result = await byName("judgment_update").handler(
      { judgment_id: 4, superseded_by_id: null, ignored: "x" },
      client,
    );

    expect(result.isError).toBeFalsy();
    expect(api.requests[0].method).toBe("PATCH");
    expect(api.requests[0].path).toBe("/api/v1/mcp/judgments/4");
    expect(api.requests[0].body).toEqual({ superseded_by_id: null });
  });

  it("judgment_update sends only the given fields", async () => {
    api.respondWith(() => ({ body: { judgment: { id: 4 } } }));
    const client = createApiClient(api.url, "oat_t");

    await byName("judgment_update").handler(
      { judgment_id: 4, outcome: "Shipped.", reason: "Fewer failures." },
      client,
    );

    expect(api.requests[0].body).toEqual({
      outcome: "Shipped.",
      reason: "Fewer failures.",
    });
  });

  it("validates the arguments of judgment_search and judgment_update", () => {
    const search = byName("judgment_search").definition;
    expect(validateArgs(search, {})).toBe("project_id is required");
    expect(validateArgs(search, { project_id: 1, query: "a" })).toBeNull();
    expect(validateArgs(search, { project_id: 1, session_id: "s" })).toBeNull();
    const update = byName("judgment_update").definition;
    expect(validateArgs(update, {})).toBe("judgment_id is required");
    expect(
      validateArgs(update, { judgment_id: 1, superseded_by_id: null }),
    ).toBeNull();
    expect(
      validateArgs(update, { judgment_id: 1, superseded_by_id: "2" }),
    ).toBe("superseded_by_id must be of type integer,null");
  });

  it("work_principles_context -> GET /api/v1/mcp/work-principles/context", async () => {
    const client = createApiClient(api.url, "oat_t");

    const result = await byName("work_principles_context").handler({}, client);

    expect(result.isError).toBeFalsy();
    expect(api.requests).toHaveLength(1);
    expect(api.requests[0].method).toBe("GET");
    expect(api.requests[0].path).toBe("/api/v1/mcp/work-principles/context");
  });

  it("work_principles_context with before_id -> GET ?before_id=", async () => {
    const client = createApiClient(api.url, "oat_t");

    const result = await byName("work_principles_context").handler(
      { before_id: 42 },
      client,
    );

    expect(result.isError).toBeFalsy();
    expect(api.requests[0].path).toBe(
      "/api/v1/mcp/work-principles/context?before_id=42",
    );
  });

  it("work_principles_context rejects a before_id that is not a positive integer", async () => {
    const client = createApiClient(api.url, "oat_t");

    for (const before_id of [0, -1, 1.5, "42"]) {
      const result = await byName("work_principles_context").handler(
        { before_id },
        client,
      );
      expect(result.isError).toBe(true);
    }
    expect(api.requests).toHaveLength(0);
  });

  it("judgment_update sends scope", async () => {
    api.respondWith(() => ({ body: { judgment: { id: 4 } } }));
    const client = createApiClient(api.url, "oat_t");

    await byName("judgment_update").handler(
      { judgment_id: 4, scope: "local" },
      client,
    );

    expect(api.requests[0].body).toEqual({ scope: "local" });
  });

  it("judgment_scope_list -> GET /api/v1/mcp/projects/:id/judgments/unscoped", async () => {
    api.respondWith(() => ({
      body: { judgments: [], next_before_id: null, remaining: 0 },
    }));
    const client = createApiClient(api.url, "oat_t");

    const first = await byName("judgment_scope_list").handler(
      { project_id: 3 },
      client,
    );
    const next = await byName("judgment_scope_list").handler(
      { project_id: 3, before_id: 42, limit: 100 },
      client,
    );

    expect(first.isError).toBeFalsy();
    expect(first.structuredContent).toEqual({
      judgments: [],
      next_before_id: null,
      remaining: 0,
    });
    expect(next.isError).toBeFalsy();
    expect(api.requests.map((r) => [r.method, r.path])).toEqual([
      ["GET", "/api/v1/mcp/projects/3/judgments/unscoped"],
      [
        "GET",
        "/api/v1/mcp/projects/3/judgments/unscoped?before_id=42&limit=100",
      ],
    ]);
  });

  it("judgment_scope_list rejects a bad project_id, before_id or limit without calling the API", async () => {
    const client = createApiClient(api.url, "oat_t");

    for (const args of [
      { project_id: "x" },
      { project_id: 0 },
      { project_id: 3, before_id: 0 },
      { project_id: 3, before_id: 1.5 },
      { project_id: 3, limit: -1 },
      { project_id: 3, limit: "50" },
    ]) {
      const result = await byName("judgment_scope_list").handler(args, client);
      expect(result.isError, JSON.stringify(args)).toBe(true);
      expect((result.structuredContent?.error as { code: string }).code).toBe(
        "invalid_input",
      );
    }
    expect(api.requests).toHaveLength(0);
  });

  it("judgment_scope_set -> POST /api/v1/mcp/judgments/scope with items only", async () => {
    api.respondWith(() => ({
      body: { updated: [1], skipped_user_set: [2], not_found: [] },
    }));
    const client = createApiClient(api.url, "oat_t");
    const items = [
      { judgment_id: 1, scope: "direction" },
      { judgment_id: 2, scope: "local" },
    ];

    const result = await byName("judgment_scope_set").handler(
      { items, ignored: "x" },
      client,
    );

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({
      updated: [1],
      skipped_user_set: [2],
      not_found: [],
    });
    expect(api.requests[0].method).toBe("POST");
    expect(api.requests[0].path).toBe("/api/v1/mcp/judgments/scope");
    expect(api.requests[0].body).toEqual({ items });
    expect(validateArgs(byName("judgment_scope_set").definition, {})).toBe(
      "items is required",
    );
  });

  it("work_principles_propose -> POST /api/v1/mcp/work-principles with candidates only", async () => {
    const response = { results: [{ status: "saved", id: 4 }] };
    api.respondWith(() => ({ body: response }));
    const client = createApiClient(api.url, "oat_t");
    const candidates = [
      {
        title: "Check the failure path before choosing a library",
        body: "",
        evidence_ids: [1, 2],
      },
    ];

    const result = await byName("work_principles_propose").handler(
      { candidates, ignored: "x" },
      client,
    );

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual(response);
    expect(api.requests).toHaveLength(1);
    expect(api.requests[0].method).toBe("POST");
    expect(api.requests[0].path).toBe("/api/v1/mcp/work-principles");
    expect(api.requests[0].body).toEqual({ candidates });
  });

  it.each([
    [
      "work_principles_update",
      { principle_id: 7, title: "T", body: "", ignored: "x" },
      "PATCH",
      "/api/v1/mcp/work-principles/7",
      { title: "T", body: "" },
    ],
    [
      "work_principles_update",
      { principle_id: 7, body: "B" },
      "PATCH",
      "/api/v1/mcp/work-principles/7",
      { body: "B" },
    ],
    [
      "work_principles_update",
      { principle_id: 7, area: "Design" },
      "PATCH",
      "/api/v1/mcp/work-principles/7",
      { area: "Design" },
    ],
    [
      "work_principles_update",
      { principle_id: 7, area: null },
      "PATCH",
      "/api/v1/mcp/work-principles/7",
      { area: null },
    ],
    [
      "work_principles_adopt",
      { principle_id: 7, title: "T", body: "B", ignored: "x" },
      "POST",
      "/api/v1/mcp/work-principles/7/adopt",
      { title: "T", body: "B" },
    ],
    [
      "work_principles_adopt",
      { principle_id: 7 },
      "POST",
      "/api/v1/mcp/work-principles/7/adopt",
      {},
    ],
    [
      "work_principles_discard",
      { principle_id: 7 },
      "DELETE",
      "/api/v1/mcp/work-principles/7",
      undefined,
    ],
  ])("%s %j -> %s %s", async (name, args, method, path, body) => {
    const client = createApiClient(api.url, "oat_t");

    const result = await byName(name).handler(args, client);

    expect(result.isError).toBeFalsy();
    expect(api.requests).toHaveLength(1);
    expect(api.requests[0].method).toBe(method);
    expect(api.requests[0].path).toBe(path);
    expect(api.requests[0].body).toEqual(body);
  });

  it.each([
    "work_principles_update",
    "work_principles_adopt",
    "work_principles_discard",
  ])("%s rejects a missing or malformed principle_id", async (name) => {
    const client = createApiClient(api.url, "oat_t");

    for (const args of [
      {},
      { principle_id: 0 },
      { principle_id: "../7" },
      { principle_id: 1.5 },
    ]) {
      const result = await byName(name).handler(args, client);
      expect(result.isError, JSON.stringify(args)).toBe(true);
      expect((result.structuredContent?.error as { code: string }).code).toBe(
        "invalid_input",
      );
    }
    expect(api.requests).toHaveLength(0);
  });

  it("formats a conflict error from work_principles_adopt", async () => {
    api.respondWith(() => ({
      status: 409,
      body: { error: "not a candidate", code: "conflict" },
    }));
    const client = createApiClient(api.url, "oat_t");

    const result = await byName("work_principles_adopt").handler(
      { principle_id: 7 },
      client,
    );

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({
      error: { code: "conflict", message: "not a candidate", status: 409 },
    });
  });

  it("requires candidates for work_principles_propose", () => {
    const def = byName("work_principles_propose").definition;
    expect(validateArgs(def, {})).toBe("candidates is required");
    expect(validateArgs(def, { candidates: [] })).toBeNull();
  });

  it("work_principles_propose sends an empty candidates array as is", async () => {
    api.respondWith(() => ({ body: { results: [] } }));
    const client = createApiClient(api.url, "oat_t");

    const result = await byName("work_principles_propose").handler(
      { candidates: [] },
      client,
    );

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({ results: [] });
    expect(api.requests[0].path).toBe("/api/v1/mcp/work-principles");
    expect(api.requests[0].body).toEqual({ candidates: [] });
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
