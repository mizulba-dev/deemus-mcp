# deemus-mcp

MCP server for Deemus. It records the judgments you make while building with AI: what you decided yourself, what you adopted from the AI, and what you delegated.

The server speaks Streamable HTTP (stateless, `POST /mcp`) and forwards the client's OAuth bearer token to the Deemus API. Authentication is handled by the MCP client's OAuth flow.

## Tools

| Tool                       | Purpose                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `project_list`             | List your projects. Match `repo_names` with the repository you work in.                                                                     |
| `project_create`           | Create a project when none matches (idempotent by name).                                                                                    |
| `project_context`          | Get a project's workstreams, your skill names and the workstream granularity rule.                                                          |
| `project_merge`            | Merge one project into another (cannot be undone).                                                                                          |
| `project_update`           | Change a project's name, summary, repository names or kind.                                                                                 |
| `project_delete`           | Delete a project that has no judgments left.                                                                                                |
| `workstream_update`        | Rename a workstream or rewrite its summary.                                                                                                 |
| `workstream_merge`         | Merge one workstream into another of the same project.                                                                                      |
| `judgment_add`             | Record up to 20 judgments for a project.                                                                                                    |
| `judgment_search`          | Search the judgments of a project, including the options you rejected.                                                                      |
| `judgment_get`             | Get one judgment with every field, including quotes and skills.                                                                             |
| `judgment_update`          | Fix a recorded judgment (title, details, quotes, skills, workstream), add an outcome or your reason, or link the judgment that replaced it. |
| `judgment_discard`         | Discard a recorded judgment, such as a duplicate.                                                                                           |
| `judgment_scope_list`      | List the judgments of a project whose scope (direction or local) is not set yet.                                                            |
| `judgment_scope_set`       | Set the scope of up to 100 judgments; scopes you set yourself are kept.                                                                     |
| `skill_list`               | List your skill names and the suggested names waiting to be added.                                                                          |
| `skill_add`                | Add a tech or domain name to your skill list (links judgments that suggested it).                                                           |
| `skill_update`             | Rename or hide a skill.                                                                                                                     |
| `skill_merge`              | Merge one skill into another of the same kind.                                                                                              |
| `skill_suggestion_discard` | Drop a suggested name without adding it.                                                                                                    |
| `work_principles_context`  | Get your judgments that set a direction (with what you chose and what you passed over) and existing work principles.                        |
| `work_principles_propose`  | Send up to 5 work principle candidates, each backed by 2 to 10 judgments.                                                                   |

Call `project_context` before `judgment_add`, and pick each judgment's workstream from the returned list. If `judgment_add` returns `needs_workstream_choice`, choose from the candidates and resend only that judgment.

To sum up your work principles, call `work_principles_context`, then send criteria that run through judgments from different situations with `work_principles_propose`. The user adopts them in Deemus.

## Development

```
npm ci
npm run dev        # starts the server on 127.0.0.1
npm run build && npm test
npm run type-check
```

`MCP_API_URL` points the server at the Deemus API. `MCP_PUBLIC_ORIGIN` and `MCP_ALLOWED_ORIGINS` configure the public origin and the allowed origins.

## Plugin

The plugin lives in `src/plugin`, and the marketplace definition in `.claude-plugin/marketplace.json`. See `src/plugin/README.md`.

## License

MIT
