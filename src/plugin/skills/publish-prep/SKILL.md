---
name: publish-prep
description: Suggest which of the user's Deemus projects and judgments to show on their page. Use only when the user asks for it ("公開の案を作って", "公開するものを選んで").
---

# Deemus Publish Prep

Read the user's projects and judgments in Deemus and send suggestions of which
to show on their page and which to highlight. The user adopts or turns down
each suggestion in Deemus and updates the page themselves. You never set a
mark and never show anything.

Run this only when the user asks. Do not run it after recording judgments, and
do not offer it on your own.

Reply to the user in the user's language, and write each reason in the user's
language too.

## Tools

This skill uses the Deemus MCP tools whose names end in `project_list`,
`publish_context` and `publish_suggest`. The prefix depends on how the server
was connected; match on the end of the name only.

If these tools are not available, tell the user that the Deemus MCP server is
not connected and stop.

## Steps

1. Call `project_list` to see the projects. Then call `publish_context` and
   read every page: while `next_before_id` is not null, call it again with
   `before_id` set to that value. If a call returns the same `next_before_id`
   as the one you sent, stop reading. If a call fails, wait a minute and retry
   with the same `before_id`; if it fails again, go on with what you read and
   tell the user how many judgments you read. Only the first call returns
   `projects` (kind, summary, `shown`, `shown_count`, `highlighted_count`,
   `previously`); read them from that response.
2. Choose what to suggest.
   - Prefer judgments the user decided themselves (`involvement` self), those
     with both a reason and rejected options, and those whose `previously` is
     null.
   - Highlight 1 or 2 judgments per project (`highlight` true): the ones that
     best show how the user weighs choices in that project.
   - Suggest projects that have many judgments that set a direction,
     especially personal projects.
   - Leave out judgments that are mostly about a procedure, and anything that
     reads as a company name, a customer, or an internal circumstance.
   - A judgment with `needs_reason` true can be suggested; the user writes
     their own reason before it can be shown. Do not write a reason for them.
   - Do not send what `previously` marks as `dismissed`, what is already
     `shown` or `highlighted`, or projects of kind `work`; the server skips
     them.
3. Write one `reason` per item (1 to 200 characters), one sentence taken from
   what the record says. Do not fill gaps with guesses.
4. Call `publish_suggest` once with everything: up to 50 judgments and 20
   projects. Suggestions the user has not decided on from an earlier call are
   replaced by this call, so never split the suggestions across calls. When
   nothing qualifies, tell the user so without calling it.
5. Read the results, which come back in input order: `saved`, `skipped`
   (`skip_reason`) or `invalid` (`errors`). Fix an `invalid` item and resend
   everything again in one call, including the saved ones.
6. Summarize to the user, in this order:
   - What you suggested (how many judgments and projects, with a few titles).
   - What needs their check: judgments that need a reason, and projects of
     kind work.
   - What you did not suggest, one line per kind (already shown, turned down
     before, local or delegated, work projects, superseded).
   - Finish with: "公開準備で採用か外すかを決め、公開ページを更新してください" (in
     the user's language).

## Rules

- Use only what the recorded judgments show.
- Never write keys, tokens, passwords, email addresses, or names of people or
  customers in a reason.
- Do not change marks or the page; the tools only suggest.
