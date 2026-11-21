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
      { redirect: "manual" },
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
      "judgment_add",
      "judgment_search",
      "judgment_update",
      "work_principles_context",
      "work_principles_propose",
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
});
