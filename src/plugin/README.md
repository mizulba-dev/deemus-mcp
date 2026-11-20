# Deemento Plugin

Deemento keeps the judgments you make while building with AI, and shows the ones you choose. It records what you decided, what you adopted from the AI, and what you delegated.

This plugin is in development. It does not yet bundle the MCP server connection; register the Deemento MCP server in your client yourself.

## Install

### Claude Code

```
/plugin marketplace add mizulba-dev/deemento-mcp
/plugin install deemento@deemento
```

### Codex

```
codex plugin marketplace add mizulba-dev/deemento-mcp
codex plugin add deemento@deemento
```

## Record judgments

When a piece of work is done, ask the AI to "record to Deemento". With this plugin installed, the `record` skill looks back over the conversation and records the judgments you made. In clients without the skill, the Deemento tools describe the essentials of what to record.

To record past Claude Code sessions, ask the AI to import them; the `import` skill reads the session files on your machine. Do not import sessions you already recorded with the `record` skill; the same judgments would be recorded twice.

### Record automatically in Claude Code and Codex

Paste this into your global rules (`~/.claude/CLAUDE.md` for Claude Code, `~/.codex/AGENTS.md` for Codex):

```
## Deemento

When you finish a piece of work (a feature, a fix, or something the user decided), use the Deemento record skill to record the judgments the user made since the last recording, without asking first. Do nothing when there is no judgment worth recording.
```

Records are saved privately. Nothing is shown to others until you choose to publish it in Deemento.
