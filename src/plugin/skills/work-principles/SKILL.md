---
name: work-principles
description: Sum up the user's work principles in Deemus from their recorded judgments. Use when the user asks to sum up, review, or organize their work principles ("仕事の考え方をまとめて", "見直して", "整理して").
---

# Deemus Work Principles

Find the criteria that run through the judgments the user recorded in different
situations, and send them to Deemus as candidates. The user decides which to
adopt.

Candidates are meant to be shown to other people on the user's public page.
Write each one as a criterion that lets a reader picture how this person
makes judgment calls and moves their work forward. Do not assume the user's
job or role, and do not use words that do.

Reply to the user in the user's language, and write titles and bodies in the
user's language too.

## Tools

This skill uses the Deemus MCP tools whose names end in
`work_principles_context` and `work_principles_propose`. The prefix depends on
how the server was connected; match on the end of the name only.

If neither tool is available, tell the user that the Deemus MCP server is not
connected and stop.

When the user asks to drop, adopt or rewrite principles they already have,
use the tools ending in `work_principles_discard`, `work_principles_adopt`
and `work_principles_update`, and only on the principles the user named. Take
the ids from `principles` in the first `work_principles_context` response.
Before summing up again, ask the user whether to drop any existing
candidates; do not drop them on your own.

## Steps

1. Call `work_principles_context`. It returns `judgments` (id, title,
   involvement, project, project_kind (work or personal), workstream,
   decided_on, situation_or_request,
   decision, rejected_options, reason; up to 50 per call, fewer when they are long, newest first),
   `new_judgments` and `next_before_id`. Only the first call (without
   `before_id`) also returns `principles` (the user's existing ones); read
   them from that response. Only judgments that set a direction are included:
   delegated judgments, choices that held only for one piece of work, and
   records with neither options nor a reason are left out. While
   `next_before_id` is not null, call it again with `before_id` set to that
   value, so that you read every judgment it returns. If a call returns the
   same `next_before_id` as the one you sent, stop reading. If a call fails,
   wait a minute and retry with the same `before_id`; if it fails again, go on
   with what you read and tell the user how many judgments you read.
2. Read all the judgments and find criteria that meet all of these:
   - **A trade-off.** From `decision` and `rejected_options` you can say what
     the user put first and what they put off or gave up.
   - **A purpose.** The judgments show what the user was trying to achieve by
     that trade-off (the `situation_or_request` and `reason`), not only what
     they gave up.
   - **The user's own judgment.** It reads as how the user weighs choices,
     not as how to operate the AI or word instructions to it, a rule they
     have to follow, a confirmation procedure or checklist, or work hygiene.
   - **More than one situation.** It shows up in 2 or more judgments from
     different situations (different projects or workstreams).
3. **Group by purpose.** When several criteria serve the same purpose (several
   choices that the judgments show were made for one shared aim), send one
   candidate built on that purpose, and use the
   individual choices as examples in its body. Do not send each choice as a
   separate candidate.
4. Drop anything that is a general lesson ("think carefully"), a rewording of
   a single judgment, or the same as an existing principle in `principles`.
5. Write each criterion:
   - `title` (1 to 80 characters) shows the trade-off and the purpose it
     serves, such as "To X, put B before A" or "When X, choose Y for Z".
   - `body` (up to 600 characters) is for a reader who does not know the
     user's circumstances. Write, in this order: the premise (in what kind of
     situation; use `project_kind` and the situations, for example whether
     the evidence comes from personal projects, work projects or both), the
     purpose, what the user gave up for it, and one or two concrete examples.
     Write the premise only from what the judgments show.
   - Give 2 to 10 judgment ids in `evidence_ids`.
6. **Read it as a stranger would.** Before sending, read each candidate as
   someone who sees only the title and body. If what the user gave up stands
   out more than what they were achieving, so that it could read as cutting
   corners, rewrite it so the premise and purpose come first. If the
   judgments do not show the purpose, drop the candidate.
7. Call `work_principles_propose` once with 0 to 5 candidates. When nothing
   qualifies, call it with `candidates` empty and tell the user "今は新しい仕事の考え方の候補はありません" (in the user's language).
8. Handle the results, which come back in input order. `saved`: done.
   `duplicate`: already exists, leave it. `invalid`: read `errors`, fix that
   candidate, and resend only it.
9. Tell the user: "候補を N 件届けました。Deemus の『仕事の考え方』で採用してください" (in the user's language), with N as the number saved.

## Rules

- Use only what the recorded judgments show. Do not fill gaps with guesses.
- Never write keys, tokens, passwords, email addresses, or names of people or
  customers.
- Do not send the same criterion again with a reworded title; a different
  title is saved as a separate candidate.
