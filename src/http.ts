#!/usr/bin/env node

import {
  createServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse,
} from "node:http";
import { fileURLToPath } from "node:url";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ApiError, createApiClient } from "./services/api/index.js";
import {
  DEFAULT_API_URL,
  createMcpServer,
  type MCPServerOptions,
} from "./server.js";

export interface HttpMcpServerOptions extends MCPServerOptions {
  allowedOrigins?: string[];
  endpoint?: string;
  host?: string;
  port?: number;
}

const OAUTH_SCOPES = ["deemento.read", "deemento.write"] as const;
const MAX_REQUEST_BODY_BYTES = 5 * 1024 * 1024;

export async function startHttpMcpServer(
  options: HttpMcpServerOptions = {},
): Promise<HttpServer> {
  const endpoint = normalizeEndpoint(options.endpoint ?? "/mcp");
  const port = options.port ?? Number(process.env.PORT ?? 3000);
  // host 未指定は 0.0.0.0 全開放。ローカル開発では HOST=127.0.0.1 を渡すこと。
  const host = options.host ?? process.env.HOST;
  const apiUrl = options.apiUrl ?? process.env.MCP_API_URL ?? DEFAULT_API_URL;
  const apiOrigin = new URL(apiUrl).origin;
  const configuredAllowedOrigins =
    options.allowedOrigins ??
    parseAllowedOrigins(process.env.MCP_ALLOWED_ORIGINS);

  const httpServer = createServer(async (req, res) => {
    try {
      await handleHttpRequest(req, res);
    } catch (error) {
      // 未捕捉例外（不正 Host 等）を吸収してプロセス停止を防ぐ。
      console.error("Unhandled error in MCP HTTP request handler:", error);
      if (!res.headersSent) {
        sendJsonRpcError(res, 400, -32000, "Bad request");
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  });

  async function handleHttpRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const requestUrl = new URL(
      req.url ?? "/",
      `http://${normalizeHostHeader(req.headers.host)}`,
    );
    const publicOrigin = getPublicOrigin(req, requestUrl);

    if (requestUrl.pathname === "/healthz") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (
      requestUrl.pathname === "/.well-known/oauth-protected-resource" ||
      requestUrl.pathname.startsWith("/.well-known/oauth-protected-resource/")
    ) {
      sendJson(res, 200, {
        resource: getResourceUrl(publicOrigin, endpoint),
        resource_name: "deemento",
        authorization_servers: [apiOrigin],
        scopes_supported: OAUTH_SCOPES,
        bearer_methods_supported: ["header"],
      });
      return;
    }

    if (requestUrl.pathname === "/.well-known/oauth-authorization-server") {
      res.writeHead(307, {
        location: `${apiOrigin}/.well-known/oauth-authorization-server`,
      });
      res.end();
      return;
    }

    if (requestUrl.pathname !== endpoint) {
      sendJsonRpcError(res, 404, -32000, "Not found");
      return;
    }

    if (
      !isAllowedOrigin(req, publicOrigin, apiOrigin, configuredAllowedOrigins)
    ) {
      sendJsonRpcError(res, 403, -32000, "Forbidden origin.");
      return;
    }

    if (req.method !== "POST") {
      res.setHeader("allow", "POST");
      sendJsonRpcError(res, 405, -32000, "Method not allowed.");
      return;
    }

    const accessToken = extractBearerToken(req.headers.authorization);
    if (!accessToken) {
      sendOAuthChallenge(res, getProtectedResourceMetadataUrl(publicOrigin));
      return;
    }

    const sessionState = await checkSession(apiUrl, accessToken);
    if (sessionState === "invalid") {
      sendOAuthChallenge(
        res,
        getProtectedResourceMetadataUrl(publicOrigin),
        true,
      );
      return;
    }
    if (sessionState === "unavailable") {
      sendJsonRpcError(res, 502, -32000, "Upstream API unavailable.");
      return;
    }

    const contentLength = parseInt(req.headers["content-length"] ?? "", 10);
    if (!isNaN(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES) {
      sendJsonRpcError(res, 413, -32000, "Request body too large.");
      return;
    }

    let parsedBody: unknown;
    try {
      parsedBody = await readRequestBody(req, MAX_REQUEST_BODY_BYTES);
    } catch (error) {
      if (error instanceof BodyTooLargeError) {
        sendJsonRpcError(res, 413, -32000, "Request body too large.");
        return;
      }
      sendJsonRpcError(res, 400, -32000, "Bad request");
      return;
    }

    // stateless: リクエストごとに server と transport を作り、応答後に閉じる。
    let unauthorized = false;
    const writeHead = res.writeHead.bind(res) as (
      status: number,
      ...rest: unknown[]
    ) => ServerResponse;
    // ツール実行中に API が 401 を返したら、transport が書く 200 応答を 401 に差し替える。
    res.writeHead = ((status: number, ...rest: unknown[]) => {
      if (!unauthorized) return writeHead(status, ...rest);
      res.setHeader(
        "www-authenticate",
        challengeHeader(getProtectedResourceMetadataUrl(publicOrigin), true),
      );
      return writeHead(401, ...rest);
    }) as typeof res.writeHead;
    const server = createMcpServer({
      ...options,
      apiUrl,
      accessToken,
      onUnauthorized: () => {
        unauthorized = true;
      },
    });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      console.error("Error handling MCP HTTP request:", error);
      if (!res.headersSent) {
        sendJsonRpcError(res, 500, -32603, "Internal server error");
      }
    }
  }

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, () => {
      httpServer.off("error", reject);
      resolve();
    });
  });

  return httpServer;
}

function normalizeEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim();
  if (!trimmed || trimmed === "/") return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function parseAllowedOrigins(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isAllowedOrigin(
  req: IncomingMessage,
  publicOrigin: string,
  apiOrigin: string,
  configuredAllowedOrigins: string[],
): boolean {
  const originHeader = req.headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;

  if (!origin) {
    return true;
  }

  const allowedOrigins = new Set([
    publicOrigin,
    apiOrigin,
    "https://claude.ai",
    "https://claude.com",
    "https://chatgpt.com",
    "https://chat.openai.com",
    ...configuredAllowedOrigins,
  ]);

  return allowedOrigins.has(normalizeOrigin(origin));
}

function normalizeOrigin(origin: string): string {
  try {
    return new URL(origin).origin;
  } catch {
    return origin;
  }
}

// 不正な Host をそのまま new URL に渡すとクラッシュするため安全なデフォルトにフォールバック。
function normalizeHostHeader(host?: string | string[]): string {
  const value = Array.isArray(host) ? host[0] : host;
  if (!value) {
    return "localhost";
  }
  if (/^[a-zA-Z0-9.\-_]+(:\d+)?$/.test(value)) {
    return value;
  }
  return "localhost";
}

// X-Forwarded-Proto を信頼してしまう設定ミスは一度だけ警告する。
let warnedUntrustedForwardedProto = false;

function getPublicOrigin(req: IncomingMessage, requestUrl: URL): string {
  const configuredOrigin = process.env.MCP_PUBLIC_ORIGIN?.trim();
  if (configuredOrigin) {
    return normalizeOrigin(configuredOrigin);
  }

  const protoHeader = req.headers["x-forwarded-proto"];
  const forwardedProto = Array.isArray(protoHeader)
    ? protoHeader[0]
    : protoHeader;

  if (forwardedProto && !warnedUntrustedForwardedProto) {
    warnedUntrustedForwardedProto = true;
    console.error(
      "WARNING: MCP_PUBLIC_ORIGIN is not set but X-Forwarded-Proto is present. " +
        "Set MCP_PUBLIC_ORIGIN explicitly when running behind a proxy or on a public host " +
        "to avoid origin spoofing.",
    );
  }

  const scheme = forwardedProto ?? requestUrl.protocol.replace(":", "");
  return `${scheme}://${normalizeHostHeader(req.headers.host)}`;
}

function getResourceUrl(publicOrigin: string, endpoint: string): string {
  return endpoint === "/" ? publicOrigin : `${publicOrigin}${endpoint}`;
}

function getProtectedResourceMetadataUrl(publicOrigin: string): string {
  return `${publicOrigin}/.well-known/oauth-protected-resource`;
}

function extractBearerToken(authorizationHeader?: string): string | undefined {
  if (!authorizationHeader?.toLowerCase().startsWith("bearer ")) {
    return undefined;
  }
  const token = authorizationHeader.slice("bearer ".length).trim();
  return token || undefined;
}

async function checkSession(
  apiUrl: string,
  accessToken: string,
): Promise<"valid" | "invalid" | "unavailable"> {
  try {
    await createApiClient(apiUrl, accessToken).get("/api/v1/mcp/session");
    return "valid";
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return "invalid";
    console.error("MCP session check failed:", error);
    return "unavailable";
  }
}

function challengeHeader(
  resourceMetadataUrl: string,
  invalidToken: boolean,
): string {
  const error = invalidToken ? 'error="invalid_token", ' : "";
  return `Bearer ${error}resource_metadata="${resourceMetadataUrl}", scope="${OAUTH_SCOPES.join(" ")}"`;
}

function sendOAuthChallenge(
  res: ServerResponse,
  resourceMetadataUrl: string,
  invalidToken = false,
): void {
  res.writeHead(401, {
    "content-type": "application/json",
    "www-authenticate": challengeHeader(resourceMetadataUrl, invalidToken),
  });
  res.end(
    JSON.stringify({
      error: "unauthorized",
      error_description: "OAuth authentication is required.",
    }),
  );
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  res.writeHead(statusCode, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function sendJsonRpcError(
  res: ServerResponse,
  statusCode: number,
  code: number,
  message: string,
): void {
  sendJson(res, statusCode, {
    jsonrpc: "2.0",
    error: { code, message },
    id: null,
  });
}

class BodyTooLargeError extends Error {}

async function readRequestBody(
  req: IncomingMessage,
  maxBytes: number,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytesRead = 0;
    let tooLarge = false;

    req.on("data", (chunk: Buffer) => {
      if (tooLarge) return;
      bytesRead += chunk.length;
      if (bytesRead > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
        reject(new BodyTooLargeError("Request body too large"));
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (tooLarge) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
  });
  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
  });

  startHttpMcpServer()
    .then((server) => {
      const address = server.address();
      const listeningOn =
        typeof address === "object" && address
          ? `${address.address}:${address.port}`
          : String(address);

      console.error(
        `deemento MCP Streamable HTTP server listening on ${listeningOn}`,
      );
      console.error("MCP endpoint: /mcp");
    })
    .catch((error) => {
      console.error("Unexpected error:", error);
      process.exit(1);
    });
}
