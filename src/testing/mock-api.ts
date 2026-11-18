import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export interface RecordedRequest {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

export interface MockApiResponse {
  status?: number;
  body?: unknown;
}

export interface MockApi {
  url: string;
  requests: RecordedRequest[];
  respondWith: (
    handler: (request: RecordedRequest) => MockApiResponse | undefined,
  ) => void;
  close: () => Promise<void>;
}

export async function startMockApi(): Promise<MockApi> {
  const requests: RecordedRequest[] = [];
  let responder: (r: RecordedRequest) => MockApiResponse | undefined = () =>
    undefined;

  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const recorded: RecordedRequest = {
        method: req.method ?? "",
        path: req.url ?? "",
        headers: req.headers,
        body: raw ? JSON.parse(raw) : undefined,
      };
      requests.push(recorded);
      const response = responder(recorded) ?? { body: { ok: true } };
      res.writeHead(response.status ?? 200, {
        "content-type": "application/json",
      });
      res.end(JSON.stringify(response.body ?? {}));
    });
  });

  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const port = (server.address() as AddressInfo).port;

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    respondWith: (handler) => {
      responder = handler;
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
