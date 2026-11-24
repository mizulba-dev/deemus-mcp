import { type AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server as HttpServer } from "node:http";
import { startHttpMcpServer } from "./http.js";
import { startMockApi, type MockApi } from "./testing/mock-api.js";

const initializeBody = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "test", version: "0" },
  },
});

function entries(count: number): Record<string, object> {
  return Object.fromEntries(
    Array.from({ length: count }, (_, i) => [`k${i}`, {}]),
  );
}

function initializeWithIcons(
  iconCount: number,
  sizeCount: number,
  capabilityCount = 0,
): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {
        experimental: entries(capabilityCount),
        extensions: entries(capabilityCount),
      },
      clientInfo: {
        name: "test",
        version: "0",
        icons: Array.from({ length: iconCount }, (_, i) => ({
          src: `https://client.deemus.test/icon-${i}.png`,
          sizes: Array.from(
            { length: sizeCount },
            (_, j) => `${j + 1}x${j + 1}`,
          ),
        })),
      },
    },
  });
}

const postHeaders = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
};

describe("HTTP MCP server", () => {
  let api: MockApi;
  let server: HttpServer;
  let base: string;
  const originalPublicOrigin = process.env.MCP_PUBLIC_ORIGIN;

  beforeEach(async () => {
    process.env.MCP_PUBLIC_ORIGIN = "https://mcp.deemus.test";
    api = await startMockApi();
    server = await startHttpMcpServer({
      apiUrl: api.url,
      host: "127.0.0.1",
      port: 0,
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    if (originalPublicOrigin === undefined) {
      delete process.env.MCP_PUBLIC_ORIGIN;
    } else {
      process.env.MCP_PUBLIC_ORIGIN = originalPublicOrigin;
    }
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await api.close();
  });

  it("serves the health check", async () => {
    const response = await fetch(`${base}/healthz`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("returns 404 for unknown paths", async () => {
    const response = await fetch(`${base}/unknown`);

    expect(response.status).toBe(404);
  });

  it("serves protected resource metadata pointing at the API", async () => {
    const response = await fetch(
      `${base}/.well-known/oauth-protected-resource`,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      resource: "https://mcp.deemus.test/mcp",
      authorization_servers: [api.url],
      scopes_supported: ["deemus.read", "deemus.write"],
    });
  });

  it("redirects authorization server metadata to the API with 307", async () => {
    const response = await fetch(
      `${base}/.well-known/oauth-authorization-server`,
      {
        redirect: "manual",
      },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${api.url}/.well-known/oauth-authorization-server`,
    );
  });

  it("answers 401 with a resource_metadata challenge when no Bearer is sent", async () => {
    const response = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: postHeaders,
      body: initializeBody,
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      'Bearer resource_metadata="https://mcp.deemus.test/.well-known/oauth-protected-resource"',
    );
    expect(api.requests).toHaveLength(0);
  });

  it("answers 401 for a non-Bearer Authorization header", async () => {
    const response = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { ...postHeaders, authorization: "Basic abc" },
      body: initializeBody,
    });

    expect(response.status).toBe(401);
  });

  it("rejects origins that are not on the allow list with 403", async () => {
    const response = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        ...postHeaders,
        authorization: "Bearer oat_x",
        origin: "https://evil.example",
      },
      body: initializeBody,
    });

    expect(response.status).toBe(403);
  });

  it("accepts allow-listed origins", async () => {
    for (const origin of [
      "https://claude.ai",
      "https://claude.com",
      "https://chatgpt.com",
      "https://chat.openai.com",
      "https://mcp.deemus.test",
      api.url,
    ]) {
      const response = await fetch(`${base}/mcp`, {
        method: "POST",
        headers: { ...postHeaders, authorization: "Bearer oat_x", origin },
        body: initializeBody,
      });
      expect(response.status, origin).toBe(200);
    }
  });

  it("rejects non-POST methods on the endpoint with 405", async () => {
    const response = await fetch(`${base}/mcp`, {
      method: "GET",
      headers: { authorization: "Bearer oat_x", accept: "text/event-stream" },
    });

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });

  it("rejects bodies over 5MB with 413", async () => {
    const response = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { ...postHeaders, authorization: "Bearer oat_x" },
      body: JSON.stringify({ pad: "x".repeat(5 * 1024 * 1024 + 1) }),
    });

    expect(response.status).toBe(413);
  });

  it("accepts initialize with client icons", async () => {
    const response = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { ...postHeaders, authorization: "Bearer oat_x" },
      body: initializeWithIcons(2, 2),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.result.serverInfo).toBeDefined();
  });

  it("accepts initialize with icons, sizes and capabilities exactly at the limit", async () => {
    const response = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { ...postHeaders, authorization: "Bearer oat_x" },
      body: initializeWithIcons(32, 32, 32),
    });

    expect(response.status).toBe(200);
  });

  it("rejects icons, sizes or capabilities over the limit as an invalid request", async () => {
    const toolsList = (params: object) => ({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params,
    });
    for (const body of [
      initializeWithIcons(33, 1),
      initializeWithIcons(1, 33),
      initializeWithIcons(1, 1, 33),
      `[${initializeWithIcons(33, 1)}]`,
      JSON.stringify(
        toolsList({ clientInfo: { icons: Array(33).fill({ sizes: 1 }) } }),
      ),
      JSON.stringify(
        toolsList({ capabilities: { experimental: entries(33) } }),
      ),
      JSON.stringify(toolsList({ capabilities: { extensions: entries(33) } })),
      JSON.stringify([
        toolsList({}),
        toolsList({ clientInfo: { icons: Array(33).fill({ sizes: 1 }) } }),
      ]),
    ]) {
      const response = await fetch(`${base}/mcp`, {
        method: "POST",
        headers: { ...postHeaders, authorization: "Bearer oat_x" },
        body,
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        jsonrpc: "2.0",
        error: { code: -32600 },
        id: null,
      });
    }
  });

  it("rejects an own __proto__ key so inherited fields cannot bypass the limit", async () => {
    const icons = JSON.stringify(
      Array.from({ length: 33 }, (_, i) => ({
        src: `https://client.example.test/${i}.png`,
      })),
    );
    const single = `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"__proto__":{"clientInfo":{"name":"t","version":"0","icons":${icons}}},"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}`;
    for (const body of [single, `[${single}]`]) {
      const response = await fetch(`${base}/mcp`, {
        method: "POST",
        headers: { ...postHeaders, authorization: "Bearer oat_x" },
        body,
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        jsonrpc: "2.0",
        error: { code: -32600 },
        id: null,
      });
    }
  });

  it("answers 401 invalid_token when the API rejects the Bearer", async () => {
    api.respondWith((r) =>
      r.path === "/api/v1/mcp/session"
        ? { status: 401, body: { error: "unauthorized", code: "unauthorized" } }
        : undefined,
    );

    const response = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { ...postHeaders, authorization: "Bearer oat_expired" },
      body: initializeBody,
    });

    expect(response.status).toBe(401);
    const challenge = response.headers.get("www-authenticate") ?? "";
    expect(challenge).toContain('error="invalid_token"');
    expect(challenge).toContain(
      'resource_metadata="https://mcp.deemus.test/.well-known/oauth-protected-resource"',
    );
    expect(api.requests.map((r) => r.path)).toEqual(["/api/v1/mcp/session"]);
    expect(api.requests[0].headers.authorization).toBe("Bearer oat_expired");
  });

  it("answers 502 when the API session check fails with 5xx", async () => {
    api.respondWith(() => ({ status: 503, body: { error: "down" } }));

    const response = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { ...postHeaders, authorization: "Bearer oat_x" },
      body: initializeBody,
    });

    expect(response.status).toBe(502);
  });

  it("answers 401 when the API returns 401 during a tool call", async () => {
    let calls = 0;
    api.respondWith((r) => {
      if (r.path === "/api/v1/mcp/session") return undefined;
      calls += 1;
      return {
        status: 401,
        body: { error: "unauthorized", code: "unauthorized" },
      };
    });

    const response = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { ...postHeaders, authorization: "Bearer oat_x" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "project_list", arguments: {} },
      }),
    });

    expect(calls).toBe(1);
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      'error="invalid_token"',
    );
  });

  it("lists tools and forwards the Bearer token on tool calls (stateless)", async () => {
    api.respondWith(() => ({ body: { items: [] } }));
    const client = new Client({ name: "test", version: "0" });
    const transport = new StreamableHTTPClientTransport(
      new URL(`${base}/mcp`),
      {
        requestInit: { headers: { authorization: "Bearer oat_flow" } },
      },
    );
    await client.connect(transport);

    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name)).toEqual([
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
      "publish_context",
      "publish_suggest",
      "publish_page_get",
    ]);

    const result = await client.callTool({
      name: "project_list",
      arguments: {},
    });
    await client.close();

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({ items: [] });
    const toolRequests = api.requests.filter(
      (r) => r.path !== "/api/v1/mcp/session",
    );
    expect(toolRequests).toHaveLength(1);
    expect(toolRequests[0].path).toBe("/api/v1/mcp/projects");
    expect(toolRequests[0].headers.authorization).toBe("Bearer oat_flow");
  });

  it("calls judgment_add through the HTTP transport", async () => {
    api.respondWith(() => ({
      body: { results: [{ status: "saved", judgment_id: 5 }] },
    }));
    const client = new Client({ name: "test", version: "0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
        requestInit: { headers: { authorization: "Bearer oat_flow" } },
      }),
    );

    const result = await client.callTool({
      name: "judgment_add",
      arguments: {
        project_id: 7,
        source: { tool: "claude-code" },
        judgments: [],
      },
    });
    await client.close();

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({
      results: [{ status: "saved", judgment_id: 5 }],
    });
    const toolRequests = api.requests.filter(
      (r) => r.path !== "/api/v1/mcp/session",
    );
    expect(toolRequests).toHaveLength(1);
    expect(toolRequests[0].method).toBe("POST");
    expect(toolRequests[0].path).toBe("/api/v1/mcp/projects/7/judgments");
  });

  it("forwards retry_at when the judgment limit is reached", async () => {
    api.respondWith((r) =>
      r.path === "/api/v1/mcp/session"
        ? undefined
        : {
            status: 429,
            body: {
              error: "limit reached",
              code: "rate_limited",
              retry_at: "2030-01-02T03:04:05Z",
            },
          },
    );
    const client = new Client({ name: "test", version: "0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
        requestInit: { headers: { authorization: "Bearer oat_flow" } },
      }),
    );

    const result = await client.callTool({
      name: "judgment_add",
      arguments: {
        project_id: 7,
        source: { tool: "claude-code" },
        judgments: [],
      },
    });
    await client.close();

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({
      error: {
        code: "rate_limited",
        message: "limit reached",
        status: 429,
        retry_at: "2030-01-02T03:04:05Z",
      },
    });
  });

  it("calls the editing tools with the right method and path", async () => {
    api.respondWith(() => ({ body: { ok: true } }));
    const client = new Client({ name: "test", version: "0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
        requestInit: { headers: { authorization: "Bearer oat_flow" } },
      }),
    );
    const calls: [string, Record<string, unknown>][] = [
      ["judgment_get", { judgment_id: 5 }],
      [
        "judgment_update",
        {
          judgment_id: 5,
          skills: { tech: ["Go"] },
          workstream: { project_id: 2, name: "W" },
        },
      ],
      ["judgment_search", { project_id: 2, session_id: "s-1" }],
      ["judgment_scope_list", { project_id: 2, before_id: 9 }],
      ["judgment_scope_set", { items: [{ judgment_id: 5, scope: "local" }] }],
      ["workstream_update", { workstream_id: 6, summary: "S", position: 1 }],
      ["workstream_merge", { workstream_id: 6, into_workstream_id: 7 }],
      ["project_update", { project_id: 8, summary: "S" }],
      ["project_delete", { project_id: 8 }],
      ["skill_list", {}],
      ["skill_add", { kind: "tech", name: "Elixir", extra: 1 }],
      ["skill_update", { skill_id: 3, hidden: true }],
      ["skill_merge", { skill_id: 3, into_skill_id: 4 }],
      ["skill_suggestion_discard", { name: "X" }],
      ["work_principles_update", { principle_id: 9, title: "T" }],
      ["work_principles_adopt", { principle_id: 9 }],
      ["work_principles_discard", { principle_id: 9 }],
      ["publish_context", { before_id: 3 }],
      [
        "publish_suggest",
        { judgments: [{ id: 5, reason: "R" }], projects: [], extra: 1 },
      ],
    ];
    for (const [name, args] of calls) {
      const result = await client.callTool({ name, arguments: args });
      expect(result.isError, name).toBeFalsy();
    }
    await client.close();

    const toolRequests = api.requests
      .filter((r) => r.path !== "/api/v1/mcp/session")
      .map((r) => [r.method, r.path, r.body]);
    expect(toolRequests).toEqual([
      ["GET", "/api/v1/mcp/judgments/5", undefined],
      [
        "PATCH",
        "/api/v1/mcp/judgments/5",
        { skills: { tech: ["Go"] }, workstream: { project_id: 2, name: "W" } },
      ],
      [
        "POST",
        "/api/v1/mcp/projects/2/judgments/search",
        { session_id: "s-1" },
      ],
      [
        "GET",
        "/api/v1/mcp/projects/2/judgments/unscoped?before_id=9",
        undefined,
      ],
      [
        "POST",
        "/api/v1/mcp/judgments/scope",
        { items: [{ judgment_id: 5, scope: "local" }] },
      ],
      ["PATCH", "/api/v1/mcp/workstreams/6", { summary: "S" }],
      ["POST", "/api/v1/mcp/workstreams/6/merge", { into_workstream_id: 7 }],
      ["PATCH", "/api/v1/mcp/projects/8", { summary: "S" }],
      ["DELETE", "/api/v1/mcp/projects/8", undefined],
      ["GET", "/api/v1/mcp/skills", undefined],
      ["POST", "/api/v1/mcp/skills", { kind: "tech", name: "Elixir" }],
      ["PATCH", "/api/v1/mcp/skills/3", { hidden: true }],
      ["POST", "/api/v1/mcp/skills/3/merge", { into_skill_id: 4 }],
      ["POST", "/api/v1/mcp/skills/suggestions/discard", { name: "X" }],
      ["PATCH", "/api/v1/mcp/work-principles/9", { title: "T" }],
      ["POST", "/api/v1/mcp/work-principles/9/adopt", {}],
      ["DELETE", "/api/v1/mcp/work-principles/9", undefined],
      ["GET", "/api/v1/mcp/publish/context?before_id=3", undefined],
      [
        "POST",
        "/api/v1/mcp/publish/suggestions",
        { judgments: [{ id: 5, reason: "R" }], projects: [] },
      ],
    ]);
  });

  it("calls judgment_discard with DELETE", async () => {
    api.respondWith(() => ({ body: { judgment_id: 4, discarded: true } }));
    const client = new Client({ name: "test", version: "0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
        requestInit: { headers: { authorization: "Bearer oat_flow" } },
      }),
    );

    const result = await client.callTool({
      name: "judgment_discard",
      arguments: { judgment_id: 4 },
    });
    await client.close();

    expect(result.isError).toBeFalsy();
    const toolRequests = api.requests.filter(
      (r) => r.path !== "/api/v1/mcp/session",
    );
    expect(toolRequests).toHaveLength(1);
    expect(toolRequests[0].method).toBe("DELETE");
    expect(toolRequests[0].path).toBe("/api/v1/mcp/judgments/4");
  });

  it("calls project_merge with both project ids", async () => {
    api.respondWith(() => ({ body: { project: { id: 3 } } }));
    const client = new Client({ name: "test", version: "0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
        requestInit: { headers: { authorization: "Bearer oat_flow" } },
      }),
    );

    const result = await client.callTool({
      name: "project_merge",
      arguments: { project_id: 2, into_project_id: 3 },
    });
    const invalid = await client.callTool({
      name: "project_merge",
      arguments: { project_id: 2, into_project_id: 0 },
    });
    await client.close();

    expect(result.isError).toBeFalsy();
    expect(invalid.isError).toBe(true);
    const toolRequests = api.requests.filter(
      (r) => r.path !== "/api/v1/mcp/session",
    );
    expect(toolRequests).toHaveLength(1);
    expect(toolRequests[0].method).toBe("POST");
    expect(toolRequests[0].path).toBe("/api/v1/mcp/projects/2/merge");
    expect(toolRequests[0].body).toEqual({ into_project_id: 3 });
  });

  it("forwards the fields judgment_update can fix", async () => {
    api.respondWith(() => ({ body: { judgment: { id: 9 } } }));
    const client = new Client({ name: "test", version: "0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
        requestInit: { headers: { authorization: "Bearer oat_flow" } },
      }),
    );

    const result = await client.callTool({
      name: "judgment_update",
      arguments: {
        judgment_id: 9,
        title: "New title",
        detail: { situation: "New situation" },
        evidence: [],
        unknown: "dropped",
      },
    });
    await client.close();

    expect(result.isError).toBeFalsy();
    const toolRequests = api.requests.filter(
      (r) => r.path !== "/api/v1/mcp/session",
    );
    expect(toolRequests).toHaveLength(1);
    expect(toolRequests[0].method).toBe("PATCH");
    expect(toolRequests[0].path).toBe("/api/v1/mcp/judgments/9");
    expect(toolRequests[0].body).toEqual({
      title: "New title",
      detail: { situation: "New situation" },
      evidence: [],
    });
  });
});
