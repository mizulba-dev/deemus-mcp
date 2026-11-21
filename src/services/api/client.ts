type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = "api_error") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function requireHttps(url: string): void {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" &&
    parsed.hostname !== "localhost" &&
    parsed.hostname !== "127.0.0.1" &&
    parsed.hostname !== "::1" &&
    parsed.hostname !== "[::1]"
  ) {
    throw new Error(
      `Refusing to send access token over plain HTTP to non-local host: ${url}`,
    );
  }
}

// 絶対 URL は apiUrl と同一オリジンのみ許可（SSRF / トークン漏洩防止）。
function resolveEndpointUrl(apiUrl: string, endpoint: string): string {
  if (!/^https?:\/\//i.test(endpoint)) {
    return `${apiUrl}${endpoint}`;
  }

  const apiOrigin = new URL(apiUrl).origin;
  const endpointOrigin = new URL(endpoint).origin;
  if (endpointOrigin !== apiOrigin) {
    throw new Error(`Refusing to send request to untrusted host: ${endpoint}`);
  }

  return endpoint;
}

interface ApiConfig {
  apiUrl: string;
  accessToken?: string;
}

function parseErrorBody(
  text: string,
  status: number,
): { code: string; message: string } {
  const fallback = {
    code: `http_${status}`,
    message: `HTTP error! status: ${status}`,
  };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return text ? { code: fallback.code, message: text } : fallback;
  }
  if (typeof data !== "object" || data === null) return fallback;
  const record = data as Record<string, unknown>;
  const nested =
    typeof record.error === "object" && record.error !== null
      ? (record.error as Record<string, unknown>)
      : record;
  const code = typeof nested.code === "string" ? nested.code : fallback.code;
  const message =
    typeof nested.message === "string"
      ? nested.message
      : typeof record.error === "string"
        ? record.error
        : fallback.message;
  return { code, message };
}

export async function apiRequest<T = unknown>(
  config: ApiConfig,
  endpoint: string,
  method: HttpMethod,
  body?: unknown,
): Promise<T> {
  const accessToken = config.accessToken;

  if (!accessToken) {
    throw new Error(
      "Deemus authentication is not configured for this MCP request.",
    );
  }

  const url = resolveEndpointUrl(config.apiUrl, endpoint);
  requireHttps(url);

  const hasBody = body !== undefined && method !== "GET" && method !== "DELETE";
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const { code, message } = parseErrorBody(
      await response.text(),
      response.status,
    );
    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export function createApiClient(apiUrl: string, accessToken?: string) {
  const config: ApiConfig = { apiUrl, accessToken };

  return {
    get: <T = unknown>(endpoint: string) =>
      apiRequest<T>(config, endpoint, "GET"),
    post: <T = unknown>(endpoint: string, body?: unknown) =>
      apiRequest<T>(config, endpoint, "POST", body),
    put: <T = unknown>(endpoint: string, body?: unknown) =>
      apiRequest<T>(config, endpoint, "PUT", body),
    patch: <T = unknown>(endpoint: string, body?: unknown) =>
      apiRequest<T>(config, endpoint, "PATCH", body),
    delete: <T = unknown>(endpoint: string) =>
      apiRequest<T>(config, endpoint, "DELETE"),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
