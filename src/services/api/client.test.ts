import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startMockApi, type MockApi } from "../../testing/mock-api.js";
import { ApiError, createApiClient } from "./client.js";

describe("api client", () => {
  let api: MockApi;

  beforeEach(async () => {
    api = await startMockApi();
  });

  afterEach(async () => {
    await api.close();
  });

  it("forwards the request Bearer token to the API", async () => {
    const client = createApiClient(api.url, "oat_secret");

    await client.get("/api/v1/mcp/projects");

    expect(api.requests).toHaveLength(1);
    expect(api.requests[0].headers.authorization).toBe("Bearer oat_secret");
  });

  it("sends JSON bodies with content-type for write methods", async () => {
    const client = createApiClient(api.url, "oat_secret");

    await client.post("/p", { a: 1 });
    await client.patch("/p", { b: 2 });

    expect(api.requests.map((r) => [r.method, r.body])).toEqual([
      ["POST", { a: 1 }],
      ["PATCH", { b: 2 }],
    ]);
    expect(api.requests[0].headers["content-type"]).toBe("application/json");
  });

  it("refuses to call without an access token", async () => {
    const client = createApiClient(api.url);

    await expect(client.get("/x")).rejects.toThrow(/authentication/);
    expect(api.requests).toHaveLength(0);
  });

  it("refuses plain HTTP to non-local hosts", async () => {
    const client = createApiClient("http://api.example.test", "oat_secret");

    await expect(client.get("/x")).rejects.toThrow(/plain HTTP/);
  });

  it("refuses absolute URLs on a different origin", async () => {
    const client = createApiClient(api.url, "oat_secret");

    await expect(client.get("http://127.0.0.1:1/steal")).rejects.toThrow(
      /untrusted host/,
    );
    expect(api.requests).toHaveLength(0);
  });

  it("turns API error bodies into ApiError with code", async () => {
    api.respondWith(() => ({
      status: 400,
      body: { error: { code: "invalid_input", message: "no" } },
    }));
    const client = createApiClient(api.url, "oat_secret");

    const error = await client.post("/x", {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: "invalid_input",
      message: "no",
    });
  });

  it("reads the flat {error, code} body shape", async () => {
    api.respondWith(() => ({
      status: 404,
      body: { error: "project not found", code: "not_found" },
    }));
    const client = createApiClient(api.url, "oat_secret");

    const error = await client.get("/x").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      code: "not_found",
      message: "project not found",
    });
  });

  it("uses http_<status> when the body has no code", async () => {
    api.respondWith(() => ({ status: 400, body: { error: "項目が不正です" } }));
    const client = createApiClient(api.url, "oat_secret");

    const error = await client.get("/x").catch((e: unknown) => e);

    expect(error).toMatchObject({
      code: "http_400",
      message: "項目が不正です",
    });
  });

  it("handles 204 as an empty object", async () => {
    const client = createApiClient(api.url, "oat_secret");
    api.respondWith(() => ({ status: 204 }));

    await expect(client.delete("/x")).resolves.toEqual({});
  });
});
