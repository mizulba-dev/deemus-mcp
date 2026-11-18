import { createRequire } from "node:module";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { setupTool } from "./tool.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { version: string };

export interface MCPServerOptions {
  apiUrl?: string;
  accessToken?: string;
  onUnauthorized?: () => void;
}

export const DEFAULT_API_URL = "http://127.0.0.1:8080";

export function createMcpServer(options: MCPServerOptions = {}): Server {
  const apiUrl = options.apiUrl ?? process.env.MCP_API_URL ?? DEFAULT_API_URL;

  const server = new Server(
    {
      name: "keel-mcp",
      title: "keel",
      version: packageJson.version,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  setupTool(server, apiUrl, options.accessToken, options.onUnauthorized);

  return server;
}
