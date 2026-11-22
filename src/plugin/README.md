# Deemus Plugin

Deemus keeps the judgments you make while building with AI, and shows the ones you choose. It records what you decided, what you adopted from the AI, and what you delegated.

The plugin bundles the skills below and the connection to the Deemus MCP server (`https://mcp.deemus.app/mcp`). On first use, your client opens the browser to sign in to Deemus and approve access.

## Install

### Claude Code

```
/plugin marketplace add mizulba-dev/deemus-mcp
/plugin install deemus@deemus
```

### Codex

```
codex plugin marketplace add mizulba-dev/deemus-mcp
codex plugin add deemus@deemus
```

## Record judgments

When a piece of work is done, ask the AI to "record to Deemus". With this plugin installed, the `record` skill looks back over the conversation and records the judgments you made. In clients without the skill, the Deemus tools describe the essentials of what to record.

To record past Claude Code or Codex sessions, ask the AI to import them; the `import` skill reads the session files on your machine (for Codex, only conversations with you; `codex exec` runs are skipped). Do not import sessions you already recorded with the `record` skill; the same judgments would be recorded twice.

## Set the scope of your judgments

Ask the AI to "set the scope of my judgments in Deemus". The `scope` skill reads the judgments that have no scope yet and marks each as a direction (it still holds after the work) or a local choice (for that piece of work only). Deemus shows the directions first. A scope you change yourself is never overwritten.

## Sum up your work principles

Ask the AI to "sum up my work principles in Deemus". The `work-principles` skill reads your recorded judgments and proposes the criteria that run through judgments made in different situations, each backed by those judgments. Adopt the ones you agree with in Deemus.

### Record and look back automatically in Claude Code and Codex

Paste this into your global rules (`~/.claude/CLAUDE.md` for Claude Code, `~/.codex/AGENTS.md` for Codex):

```
## Deemus

When you finish a piece of work (a feature, a fix, or something the user decided), use the Deemus record skill to record the judgments the user made since the last recording, without asking first. Do nothing when there is no judgment worth recording.

Before proposing a design, an implementation approach, or a refactoring direction, use Deemus's judgment_search to check the past judgments and rejected options of this repository's project, and do not propose anything that contradicts them. If the project cannot be determined, do not search.
```

Records are saved privately. Nothing is shown to others until you choose to publish it in Deemus.
