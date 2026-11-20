# deemento-mcp

MCP server for Deemento. It records the judgments you make while building with AI: what you decided yourself, what you adopted from the AI, and what you delegated.

The server speaks Streamable HTTP (stateless, `POST /mcp`) and forwards the client's OAuth bearer token to the Deemento API. Authentication is handled by the MCP client's OAuth flow.

## Tools

| Tool                      | Purpose                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `project_list`            | List your projects. Match `repo_names` with the repository you work in.            |
| `project_create`          | Create a project when none matches (idempotent by name).                           |
| `project_context`         | Get a project's workstreams, your skill names and the workstream granularity rule. |
| `judgment_add`            | Record up to 20 judgments for a project.                                           |
| `work_principles_context` | Get your recent judgments and existing work principles.                            |
| `work_principles_propose` | Send up to 5 work principle candidates, each backed by 2 to 10 judgments.          |

Call `project_context` before `judgment_add`, and pick each judgment's workstream from the returned list. If `judgment_add` returns `needs_workstream_choice`, choose from the candidates and resend only that judgment.

To sum up your work principles, call `work_principles_context`, then send criteria that run through judgments from different situations with `work_principles_propose`. The user adopts them in Deemento.

## Development

```
npm ci
npm run dev        # starts the server on 127.0.0.1
npm run build && npm test
npm run type-check
```

`MCP_API_URL` points the server at the Deemento API. `MCP_PUBLIC_ORIGIN` and `MCP_ALLOWED_ORIGINS` configure the public origin and the allowed origins.

## Plugin

The plugin lives in `src/plugin`, and the marketplace definition in `.claude-plugin/marketplace.json`. See `src/plugin/README.md`.

## License

MIT
