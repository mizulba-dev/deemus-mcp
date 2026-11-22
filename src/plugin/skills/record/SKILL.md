---
name: record
description: Record the judgments the user made in the current conversation into Deemus. Use when the user asks to record, save, or log their judgments or decisions to Deemus, or when the user's own rules say to record judgments after a piece of work.
---

# Deemus Record

Look back over the current conversation, pick out the judgments the user made
while building with AI, and record them in Deemus.

Reply to the user in the user's language, and write every recorded judgment
(titles, situations, decisions, workstream names and summaries) in the user's
language too.

## Tools

This skill uses the Deemus MCP tools whose names end in `project_list`,
`project_create`, `project_context`, `judgment_search` and `judgment_add`, and
`skill_add` when the user asks to add a skill name. The prefix in front of
the name depends on how the server was connected; match on the end of the name
only.

If none of these tools is available, tell the user that the Deemus MCP server
is not connected and stop. Do not write judgments anywhere else.

## Steps

1. **Find what is new.** Record only judgments made since the last time you
   recorded in this conversation. Look at your earlier `judgment_add` calls in
   this conversation and leave out every judgment they already sent, even if
   you would word its title differently now: a reworded title is recorded
   again as a separate judgment. If nothing new is worth recording, stop
   without calling any tool. When the user's own rules started this skill,
   stop silently.

2. **Choose the project.** Reuse the project of your earlier `judgment_add`
   calls in this conversation, if any. Otherwise call `project_list` and
   compare the name of the current repository (if you are working in one) with
   each project's `repo_names`, then with its `name`.
   - Exactly one clear match: use it.
   - No project fits and you are working in a repository: create one with
     `project_create`, using the repository name as `name` and in
     `repo_names`, and tell the user.
   - Otherwise (several candidates, a project that might fit but does not list
     the repository, or no repository at all): ask the user which project to
     use. Do not guess.

3. **Load the project context.** Call `project_context` with the project id.
   Keep its `workstreams` (id, name, summary), `skills` (tech and domain names)
   and `workstream_rule` (how coarse a workstream should be) for the rules below.

4. **Record the judgments.** Extract them with the rules below and call
   `judgment_add`:
   - `source.tool`: the name of your work environment, for example
     `claude-code`, `codex`, `claude-desktop`, `claude-ai` or `chatgpt`.
   - `source.session_id`: the ID of the current session when your environment
     exposes one; otherwise leave it out.
   - Up to 20 judgments per call; split larger sets into several calls.
   - `supersedes`: when the user reversed an earlier judgment, find it with
     `judgment_search` (`include_superseded` left off) and put its id in
     `supersedes` of the new judgment (up to 10 ids, same project). Leave it out
     when you cannot find it.
   - `decided_on` (`YYYY-MM-DD`): the user's local date of the message where
     the user decided (for delegated work, where the user handed it over).

5. **Handle the results.** Results come back in the order you sent them.
   - `saved`: done. `duplicate: true` means it was already recorded. With
     `discarded: true` the user discarded it: leave it, and do not report it
     as recorded.
   - `needs_workstream_choice`: nothing was saved for that judgment. Choose one
     of `candidates` (send `workstream: {id}`), or, if none of them is the same
     workstream, send `workstream: {name, summary, create_new: true}`. Resend only
     that judgment. When you cannot tell which candidate is right, ask the
     user.
   - `needs_workstream_choice` with empty `candidates`, or with `reason`
     `similarity_unavailable`: the server could not compare workstreams. Sending
     the same request again usually returns the same result, so do not just
     retry. Look at the `project_context` workstream list yourself and resend
     with the `id` of a fitting workstream, or with `create_new: true` when none
     fits.
   - `invalid`: read `errors`, fix that judgment, and resend only it.

   When several judgments go to the same new workstream, send only the first one
   with the new name (with `create_new: true` if needed), then send the others
   with the workstream `id` returned for it. Never send `create_new: true` again
   with a reworded name: a different name creates a separate workstream (the
   exact same name reuses the existing one).

6. **Report to the user** in one or two lines: how many judgments were
   recorded, by involvement (`self`, `adopted`, `delegated`), and the ones
   recorded with an empty reason (`self` without `reason`, `adopted` without
   `own_reason`) so the user can add the reason in Deemus. Also mention
   new workstreams, technology names that were not in the project's skill
   list, judgments about another product that you did not record, and any
   judgment you could not record, and why. When the `judgment_add` response
   has `work_principles_hint`, add one line saying Deemus can sum up the
   user's work principles.

## What counts as a judgment

A judgment is one decision in a specific situation: which workstream, what the
problem was, and what was decided. It is material the user may later show to
others, for example to explain in an interview what they decided and why.

- **Never write a general lesson.** Always state the situation: which workstream,
  and what the user was struggling with (`situation`, or `request` for
  delegated work).
- **Skip trivial things**: typo fixes, requests to run a command, permission
  approvals, greetings, progress checks. A question from the user that did
  not lead to a decision is not a judgment either.
- **Pick the ones worth telling**: those the user could talk about for a
  minute in an interview. Zero is fine when nothing qualifies.
- **Do not fill gaps.** Record only what the conversation shows the user said
  or chose. Do not supply words the user did not write.
- **Explain project-specific terms.** When a name would mean nothing to a
  listener outside the project, add a short explanation in parentheses.

### Involvement

Choose exactly one:

- `self` — the user decided: rejected the AI's proposal, chose between
  options, set a constraint, or caught a mistake. There must be something the
  user said or answered to support it.
- `adopted` — the user accepted the approach the AI proposed as it was.
- `delegated` — the user had the AI build something on its own. Record the
  whole task as one judgment and list the choices the AI made inside it in
  `ai_decisions`; do not split them into separate judgments. A choice the AI
  made without any comment from the user belongs here, not in `self`.

Where the line falls:

- The user asked or pointed something out, but the AI came up with the
  concrete approach and the user only agreed → `adopted`. If the user stated
  a criterion or a constraint in their own words → `self`.
- The user found a defect and the AI proposed the fix → `self`. The chosen
  option may be `by_ai: true`.
- The AI offered options and the user picked one other than the recommended
  one, or answered in their own words → `self`, with the options in `options`.
  The user picked the recommended option and said nothing more → `adopted`,
  with `own_reason` empty.
- The user turned down what the AI was about to do and said what to do
  instead → `self`: the AI's approach is an option with
  `by_ai: true, adopted: false`, and the user's instruction is the decision.
- One piece of delegated work is one judgment, even when the user approved it
  stage by stage. Keep the `ai_decisions` that shaped the result, up to 10.

### Scope

Set `scope` on every judgment. It says how long the judgment holds. Choose one
of two:

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

If you are unsure, choose `direction`. Do not set `scope` from how much the
user said about it; judge by whether it still holds after the work.

### Fields

Use only the keys of the chosen involvement (`judgment_add` rejects the
others):

- `self`: `situation`, `options` (each `label`, `by_ai`, `adopted`),
  `decision`, `reason`, `hard_part`
- `adopted`: `situation`, `ai_proposal`, `ai_reason`, `own_reason`
- `delegated`: `request`, `why_needed`, `conditions`, `verified`,
  `ai_decisions`

Also send `title` and `scope` (see Scope), and `outcome` when the record
shows what came of it.

Limits (`judgment_add` rejects values over them):

- `title`: 1 to 80 characters.
- Every text field in the content, and `outcome`: up to 2000 characters.
- `options`: up to 6; each `label` 1 to 300 characters.
- `ai_decisions`: up to 10; each 1 to 300 characters.
- `evidence`: up to 3; each 1 to 200 characters.
- A new workstream: `name` 1 to 80 characters, `summary` up to 200.
- Up to 20 judgments per call.

**Never fill in a reason by guessing.** When the record does not state why the
user decided, leave `reason` (`self`) or `own_reason` (`adopted`) empty. The
same goes for every optional field: leave it empty unless the record states
it. The AI's own explanation goes in `ai_reason`, never in `own_reason`.

`verified` is only what the user checked themselves (ran it and looked, found
something in review, ...). Checks the AI ran (tests, reviews) go in
`ai_decisions` or `outcome`. Leave `verified` empty when the record shows no
check by the user.

### Evidence

Add up to 3 short quotes of the user's own words in `evidence` (each up to 200
characters). Never quote the AI. When the user only picked an option the AI
wrote, leave `evidence` empty. Join line breaks into one line. When a quote
contains an email address or a secret, mask that part or drop the quote.

### Workstreams

- Pick the workstream from the `project_context` list whenever one fits, and send
  its `id`.
- Only when none fits, send a new `name` with a one-sentence `summary`,
  following `workstream_rule`.
- **Never name a workstream after the topic of a single judgment.** A workstream is
  something the user worked on: a feature they built, a release or publishing
  task, a shared foundation, and so on. Many judgments belong to it.
- Judgments that do not fit a specific piece of work (rules for the whole
  repository, how development is run, when to hand work to the AI) go to the
  single workstream for the way of working. Use it if the list already has one; otherwise create one,
  named in the user's language for "how we develop". Keep one such workstream per
  project.

### Judgments about another product

When some judgments in a session are about a different product, record them
in that product's project if `project_list` has it. If not, do not record
them and do not create a project without asking; list them in the final
report.

### Skills

- `skills.domain`: only names from the `project_context` list.
- `skills.tech`: names from the list. If a technology clearly used in the
  judgment is not in the list, you may still send its name; it is kept as a
  suggestion. Keep track of such names and report them to the user at the end.
  If the user asks to add one to the list, add it with `skill_add`; the
  judgments that carry it are linked at the same time. Do not add names the
  user did not ask for.

### Secrets and personal information

Never write keys, tokens, passwords, email addresses, or the names of people
or customers in any field, including `evidence`. Never copy `[REDACTED]`
markers or what they stand for. Product and technology names are fine.
