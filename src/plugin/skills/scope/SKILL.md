---
name: scope
description: Set the scope (direction or local) of the judgments the user already recorded in Deemus. Use when the user asks to set, add, or review the scope of their recorded judgments ("判断に大きさを付けて", "大きさを付け直して").
---

# Deemus Scope

Set the scope of judgments the user already recorded, project by project, so
Deemus can show the judgments that set a direction apart from the choices made
for one piece of work.

Reply to the user in the user's language.

## Tools

This skill uses the Deemus MCP tools whose names end in `project_list`,
`judgment_scope_list`, `judgment_scope_set`, `judgment_search` and
`judgment_update`. The prefix depends on how the server was connected; match
on the end of the name only.

If none of these tools is available, tell the user that the Deemus MCP server
is not connected and stop.

## What scope means

Choose one of two for each judgment:

- `direction` — it still holds after the work is done, and later work builds
  on it: a mechanism, how data is kept, the structure of a screen, pricing or
  limits, how something is published. Examples: "keep the refresh token in an
  HttpOnly cookie", "cap each user at 50 API calls a day", "split the settings
  page into three tabs".
- `local` — a choice for that piece of work only; its effect ends with the
  work: the steps taken that time, doing it now or later, the scope of the
  task, a temporary switch in operation. Examples: "commit the generated mocks
  in this change", "leave the translation for a later change", "turn off the
  nightly job while the migration runs".

If you are unsure, choose `direction`. Judge from the title, situation,
decision and rejected options; do not guess beyond what they say.

## Which kind of request

Decide first which of two the user asked for, and do only that one:

- **Named judgments** — the user pointed at particular judgments ("this one
  is only for that change", "set the scope of the judgments about the login
  page"). Follow "Setting named judgments". Do not touch any other judgment,
  not even ones without a scope.
- **A range in bulk** — the user asked to set the scope of every judgment of
  a project, or of all their projects. Follow "Setting a range in bulk".

When it is unclear which one the user meant, or a bulk request names no
project, ask the user before you change anything. Never widen a request to
every project on your own.

## Setting named judgments

1. Find each judgment the user named with `judgment_search` (in the project
   the user meant) and confirm the ids from the titles. When a description
   fits several judgments and you cannot tell which, ask the user.
2. Decide `direction` or `local` for those judgments only, and send them with
   `judgment_scope_set` (`{judgment_id, scope}`, each judgment once).
3. Ids that come back in `skipped_user_set` are judgments whose scope the user
   set themselves. Change one of them only when the user asked for that
   judgment by name, with `judgment_update` and `scope` alone.
4. Tell the user which judgments you set to `direction` and to `local`.

## Setting a range in bulk

1. **Fix the range.** Use the project the user named. When the user asked for
   all projects, call `project_list` and work through every project, one at a
   time. When no project was named and the user did not say all, ask which.

2. **Read the judgments without a scope.** Call `judgment_scope_list` with the
   project id (`limit` up to 100). It returns `judgments` (newest first),
   `remaining` (how many in the project still have no scope) and
   `next_before_id`.

3. **Judge and set.** Decide `direction` or `local` for every judgment of the
   page, then call `judgment_scope_set` with up to 100 items
   (`{judgment_id, scope}`), each judgment once. The result lists `updated`,
   `skipped_user_set` (the user set that scope themselves; it is never
   changed, so leave it) and `not_found` (discarded meanwhile; leave it).

4. **Go on.** While `next_before_id` is not null, call `judgment_scope_list`
   again with `before_id` set to it, and repeat step 3. If a call returns the
   same `next_before_id` as the one you sent, stop reading that project. If a
   call fails, wait a minute and retry once; if it fails again, move on and
   tell the user.

5. **Report to the user**, per project, how many judgments you set to
   `direction` and to `local`, and how many were skipped because the user had
   set them.

## Rules

- Change only the scope. Do not touch any other field of a judgment.
- Never write keys, tokens, passwords, email addresses, or names of people or
  customers in your report.
