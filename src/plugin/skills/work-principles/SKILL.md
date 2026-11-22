---
name: work-principles
description: Sum up the user's work principles in Deemus from their recorded judgments. Use when the user asks to sum up, review, or organize their work principles ("仕事の考え方をまとめて", "見直して", "整理して").
---

# Deemus Work Principles

Find the criteria that run through the judgments the user recorded in different
situations, and send them to Deemus as candidates. The user decides which to
adopt.

Reply to the user in the user's language, and write titles and bodies in the
user's language too.

## Tools

This skill uses the Deemus MCP tools whose names end in
`work_principles_context` and `work_principles_propose`. The prefix depends on
how the server was connected; match on the end of the name only.

If neither tool is available, tell the user that the Deemus MCP server is not
connected and stop.

## Steps

1. Call `work_principles_context`. It returns `judgments` (id, title,
   involvement, project, workstream, decided_on, situation_or_request, reason;
   200 per call, newest first), `principles` (the user's existing ones),
   `new_judgments` and `next_before_id`. While `next_before_id` is not null,
   call it again with `before_id` set to that value, so that you read every
   judgment the user recorded. If a call returns the same `next_before_id` as
   the one you sent, stop reading. If a call fails, wait a minute and retry
   with the same `before_id`; if it fails again, go on with what you read and
   tell the user how many judgments you read.
2. Read all the judgments and find criteria that show up in 2 or more judgments
   from different situations (different projects or workstreams).
3. Drop anything that is a general lesson ("think carefully"), a rewording of
   a single judgment, or the same as an existing principle in `principles`.
4. Write each criterion as `title` in the form "what to prioritize when
   choosing" or "what to check before choosing" (1 to 80 characters). Put a
   short explanation in `body` (up to 600 characters, may be empty). Give 2 to
   10 judgment ids in `evidence_ids`.
5. Call `work_principles_propose` once with 0 to 5 candidates. When nothing
   qualifies, call it with `candidates` empty and tell the user "今は新しい仕事の考え方の候補はありません" (in the user's language).
6. Handle the results, which come back in input order. `saved`: done.
   `duplicate`: already exists, leave it. `invalid`: read `errors`, fix that
   candidate, and resend only it.
7. Tell the user: "候補を N 件届けました。Deemus の『仕事の考え方』で採用してください" (in the user's language), with N as the number saved.

## Rules

- Use only what the recorded judgments show. Do not fill gaps with guesses.
- Never write keys, tokens, passwords, email addresses, or names of people or
  customers.
- Do not send the same criterion again with a reworded title; a different
  title is saved as a separate candidate.
