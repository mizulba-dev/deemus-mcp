import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, "prep.mjs");
const session = "aaaaaaaa-0000-4000-8000-000000000001";
const fixture = join(here, "__fixtures__", "claude", `${session}.jsonl`);

type Run = { code: number; stdout: string; stderr: string };

function run(args: string[]): Promise<Run> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [script, ...args],
      { encoding: "utf8" },
      (error, stdout, stderr) => {
        const code =
          error === null ? 0 : typeof error.code === "number" ? error.code : 1;
        resolve({ code, stdout, stderr });
      },
    );
  });
}

function block(output: string, heading: string): string {
  const start = output.indexOf(heading);
  expect(start, heading).toBeGreaterThanOrEqual(0);
  const next = output.indexOf("\n### ", start + heading.length);
  return output.slice(start, next < 0 ? undefined : next);
}

describe("prep.mjs", () => {
  let result: Run;

  beforeAll(async () => {
    result = await run([fixture]);
  });

  it("writes the session header", () => {
    expect(result.code).toBe(0);
    expect(result.stdout.split("\n").slice(0, 5)).toEqual([
      `# Session ${session}`,
      "Directory: example-shop",
      "Period: 2026-03-02 10:00 UTC - 2026-03-02 10:44 UTC",
      "User messages: 4",
      "Answered questions: 4",
    ]);
  });

  it("keeps each multiple-choice question with its options, recommendation and the user's answer", () => {
    const out = result.stdout;

    const recommended = block(
      out,
      "Question: How many times should a charge that timed out be retried?",
    );
    expect(recommended).toContain(
      "  1. Up to 3 times with backoff (Recommended) - Spreads the attempts",
    );
    expect(recommended).toContain("  2. Once, immediately - ");
    expect(recommended).toContain("  3. No automatic retry - ");
    expect(recommended).toContain(
      "Answer: Up to 3 times with backoff (Recommended)\n  -> picked the recommended option",
    );

    const other = block(
      out,
      "Question: Where should each payment attempt be recorded?",
    );
    expect(other).toContain(
      "Answer: A new payment_attempts table\n  -> picked option 2, not the recommended one (recommended: option 1)",
    );

    const ownWords = block(
      out,
      "Question 1 of 2: Which errors should trigger a retry?",
    );
    expect(ownWords).toContain(
      "Answer: Only timeouts and network errors, never a declined card\n  -> answered in the user's own words (not one of the options)",
    );
    expect(ownWords).toContain(
      "Question 2 of 2: What should the customer see while a retry is pending?",
    );
    expect(ownWords).toContain(
      "Answer: A spinner only\n  -> picked option 1 (no option was marked as recommended)",
    );

    const declined = block(out, "Question: Should refunds be retried as well?");
    expect(declined).toContain(
      "Answer: (the user declined to answer the question)",
    );
    expect(declined).not.toContain("reformulate the questions");
  });

  it("drops long option attachments such as previews", () => {
    expect(result.stdout).not.toContain("PREVIEW-MOCKUP-BODY");
  });

  it("keeps the conversation in the order it happened", () => {
    const markers = [
      "I want to add retries for temporary failures.",
      "I'll look at the payment client first.",
      "[AI used tools: Read x2, Bash]",
      "Here is what I found.",
      "Question: How many times should a charge",
      "Next, where should the attempts be recorded?",
      "Question: Where should each payment attempt be recorded?",
      "Keep each attempt as its own row",
      "Question 1 of 2: Which errors should trigger a retry?",
      "[the user ran a shell command: npm test -- payments]",
      "Two tests fail.",
      "Noted. The old config still contains",
      "Question: Should refunds be retried as well?",
      "Refunds are out of scope for this change.",
      "[the user rejected Edit]",
      "[the user rejected Bash]",
      "Question: Should the retry limit be configurable per merchant?",
      "Answer: (the question failed with a tool error; there is no answer)",
      "Retries are in place",
    ];
    const positions = markers.map((marker) => result.stdout.indexOf(marker));
    positions.forEach((position, i) => {
      expect(position, markers[i]).toBeGreaterThanOrEqual(0);
    });
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("summarizes tool calls by their names only", () => {
    expect(result.stdout).toContain("[AI used tools: Read x2, Bash]");
    expect(result.stdout).not.toContain("src/payments/client.ts");
    expect(result.stdout).not.toContain("Run payment tests");
  });

  it("drops tool results, system-inserted text and subagent records", () => {
    for (const hidden of [
      "TOOL-RESULT-FILE-CONTENT",
      "TOOL-RESULT-BASH-OUTPUT",
      "INJECTED-REMINDER-TEXT",
      "Caveat: The messages below",
      "TASK-NOTIFICATION-TEXT",
      "SUMMARY-INJECTED",
      "Request interrupted by user",
      "SIDECHAIN-PROMPT",
      "SIDECHAIN-REPLY",
      "SYNTHETIC-API-ERROR",
      "THINKING-TEXT",
    ]) {
      expect(result.stdout, hidden).not.toContain(hidden);
    }
  });

  it("drops output of commands the user ran", () => {
    expect(result.stdout).toContain("[the user ran /model]");
    for (const hidden of [
      "USER-SHELL-STDOUT",
      "Tests: 2 failed",
      "USER-SHELL-STDERR",
      "LOCAL-COMMAND-OUTPUT",
    ]) {
      expect(result.stdout, hidden).not.toContain(hidden);
    }
  });

  it("redacts key-shaped strings", () => {
    for (const secret of [
      "sk-fake-example-0000-not-real",
      "ghp_FAKEexample0000token00",
      "AKIA0000111188889999",
      "eyJmYWtlIjoxfQ.eyJmYWtlIjoyfQ.ZmFrZS1zaWc",
      "BEGIN PRIVATE KEY",
      "FAKEKEYBODYFORTESTSONLY",
    ]) {
      expect(result.stdout, secret).not.toContain(secret);
    }
    const message = block(result.stdout, "### User (2026-03-02 10:23 UTC)");
    expect(message).toContain("gateway key [REDACTED]\n");
    expect(message).toContain("ci token [REDACTED]\n");
    expect(message).toContain("aws key [REDACTED]\n");
    expect(message).toContain("session [REDACTED]\n");
    expect(message).toContain(
      "[REDACTED]\nAfter that, check why the retry test fails.",
    );
    expect(result.stdout).toContain(
      "The old config still contains [REDACTED], so it should be rotated.",
    );
  });

  it("truncates long AI messages and says so", async () => {
    const long = block(result.stdout, "### AI\nHere is what I found.");
    expect(long).not.toContain("LONG-MESSAGE-TAIL");
    expect(long).toMatch(/ \[truncated: \d+ more characters\]/);
    expect(result.stdout).toContain(
      "### AI\nI'll look at the payment client first.\n",
    );

    const short = await run([fixture, "--max-assistant-chars", "20"]);
    expect(short.code).toBe(0);
    expect(short.stdout).toContain("### AI\nHere is what I found [truncated: ");
    const full = `Here is what I found. ${"The client calls the gateway once and treats any error as final. ".repeat(30)}LONG-MESSAGE-TAIL`;
    expect(short.stdout).toContain(
      `[truncated: ${full.length - 20} more characters]`,
    );
    expect(short.stdout).toContain(
      "### AI\nI'll look at the pay [truncated: 18 more characters]",
    );
  });

  it("skips malformed lines and reports how many", () => {
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain("BROKEN-LINE");
    expect(result.stderr).toBe("prep: skipped 2 malformed line(s)\n");
  });

  it("exits non-zero with usage on bad arguments", async () => {
    for (const args of [
      [],
      [join(here, "__fixtures__", "claude", "missing.jsonl")],
      [join(here, "__fixtures__", "claude")],
      [fixture, "--max-assistant-chars"],
      [fixture, "--max-assistant-chars", "0"],
      [fixture, "--unknown"],
      [fixture, fixture],
    ]) {
      const failed = await run(args);
      expect(failed.code, args.join(" ")).not.toBe(0);
      expect(failed.stderr, args.join(" ")).toContain(
        "usage: node prep.mjs <session.jsonl>",
      );
      expect(failed.stdout, args.join(" ")).toBe("");
    }
  });
});

describe("prep.mjs answers recorded in various forms", () => {
  const answersFixture = join(
    here,
    "__fixtures__",
    "claude",
    "aaaaaaaa-0000-4000-8000-000000000002.jsonl",
  );
  let out: string;

  beforeAll(async () => {
    const answered = await run([answersFixture]);
    expect(answered.code).toBe(0);
    out = answered.stdout;
  });

  function answerOf(question: string): string {
    const start = out.indexOf(question);
    expect(start, question).toBeGreaterThanOrEqual(0);
    const answerAt = out.indexOf("\nAnswer: ", start);
    const end = out.indexOf("\n", out.indexOf("\n  -> ", answerAt) + 1);
    return out.slice(answerAt + 1, end < 0 ? undefined : end);
  }

  it("reads each answer by matching the option names, without a trailing quote", () => {
    const answers = out
      .split("\n")
      .filter((line) => line.startsWith("Answer: "));
    expect(answers).toEqual([
      "Answer: 3 回のまま（現状のまま・推奨）",
      'Answer: 注文の表の列（status="retrying"）',
      "Answer: 長い文で、理由も出す",
      "Answer: カード（推奨）",
      "Answer: タイムアウト (Recommended), 通信の切断 (Recommended)",
      "Answer: 90 日（監査向け）",
      'Answer: 保留にして、"要確認" の印を付ける',
      "Answer: いつでも (Recommended)",
      "Answer: 店舗の担当者と運営チームの両方",
      "Answer: (no option selected)",
      "Answer: 取り消さない",
      "Answer: 入れない",
      "Answer: (the user replied in their own words instead of picking)",
    ]);
    expect(answerOf("Question 2 of 3: 試行の記録は、どこに置く？")).toContain(
      "  -> picked option 2,",
    );
    expect(answerOf("Question: 上限まで失敗した注文は、どう扱う？")).toContain(
      "  -> answered in the user's own words (not one of the options)",
    );
    expect(out).toContain("Answered questions: 11");
  });

  it("recognizes every way of marking the recommended option", () => {
    const expected: [string, string][] = [
      [
        'Question 1 of 3: 再試行の上限は、"max_attempts=3" のままにする？（いまの設定）',
        "  -> picked the recommended option",
      ],
      [
        "Question 2 of 3: 試行の記録は、どこに置く？",
        "  -> picked option 2, not the recommended one (recommended: option 1)",
      ],
      [
        "Question 3 of 3: 再試行中の通知の文言は、どうする？",
        "  -> picked option 2, not the recommended one (recommended: option 1)",
      ],
      [
        "Question: 最初に対応する支払い方法は？",
        "  -> picked the recommended option",
      ],
      [
        "Question: 再試行の対象にする失敗は？",
        "  -> picked options 1, 2, all of them recommended",
      ],
      [
        "Question: 試行の記録を残す期間は？",
        "  -> picked option 2 (no option was marked as recommended)",
      ],
      [
        "Question: 上限まで失敗した注文は、どう扱う？",
        "  -> answered in the user's own words (not one of the options)",
      ],
    ];
    for (const [question, classification] of expected) {
      expect(answerOf(question), question).toMatch(
        new RegExp(`\\n${classification.replace(/[()]/g, "\\$&")}$`),
      );
    }
  });

  it("drops previews attached to an answer", () => {
    for (const hidden of [
      "PREVIEW-BODY-ONE",
      "PREVIEW-BODY-TWO",
      "別の文",
      "selected preview",
    ]) {
      expect(out, hidden).not.toContain(hidden);
    }
  });
});

describe("prep.mjs rejected tool uses", () => {
  let out: string;

  beforeAll(async () => {
    out = (await run([fixture])).stdout;
  });

  it("shows tool uses the user rejected, with what the user said", () => {
    expect(out).toContain(
      "[the user rejected Edit]\nUser said: Do not touch the gateway client. Put the retry loop in the checkout service so other callers keep the old behavior.",
    );
    expect(out).toContain("[the user rejected Bash]\n\n[AI used tools: Edit]");
    expect(out).not.toContain("TOOL-RESULT-EDIT-APPLIED");
    expect(out).not.toContain("TOOL-INPUT-OLD");
    expect(out).not.toContain("STOP what you are doing");
  });

  it("keeps what the user wrote when declining a question", () => {
    expect(
      block(
        out,
        "Question: Should the retry limit be configurable per merchant?",
      ),
    ).toContain(
      "Answer: (the user declined to answer the question)\nUser said: One global limit for now. Merchants have not asked for this.",
    );
    expect(out).not.toContain("The tool use was rejected");
  });

  it("marks a question that failed with a tool error", () => {
    expect(out).toContain(
      "Answer: (the question failed with a tool error; there is no answer)",
    );
    expect(out).not.toContain("InputValidationError");
  });
});

describe("prep.mjs answer text wordings", () => {
  let out: string;

  beforeAll(async () => {
    out = (
      await run([
        join(
          here,
          "__fixtures__",
          "claude",
          "aaaaaaaa-0000-4000-8000-000000000002.jsonl",
        ),
      ])
    ).stdout;
  });

  it("reads every wording of the answer text without boilerplate", () => {
    expect(block(out, "Question 1 of 3: 再試行を走らせる時間帯は？")).toContain(
      "Answer: いつでも (Recommended)\n  -> picked the recommended option\nUser note: ただし深夜の大量の再試行は避けたい\n",
    );
    expect(block(out, "Question 2 of 3: 失敗の知らせは、誰に送る？")).toContain(
      "Answer: 店舗の担当者と運営チームの両方\n  -> answered in the user's own words (not one of the options)\n",
    );
    expect(block(out, "Question 3 of 3: 管理画面にも出す？")).toContain(
      "Answer: (no option selected)",
    );
    const idle = block(
      out,
      "Question: 再試行の上限に達したら、注文を取り消す？",
    );
    expect(out).toContain(
      "(the question timed out; the answers below were selected but not submitted)\n\nQuestion: 再試行の上限に達したら、注文を取り消す？",
    );
    expect(idle).toContain(
      "Answer: 取り消さない\n  -> picked option 2, not the recommended one (recommended: option 1)",
    );
    expect(out).toContain(
      "(the user asked the AI for more questions)\n\nQuestion: 返金にも同じ再試行を入れる？",
    );
    expect(block(out, "Question: 返金にも同じ再試行を入れる？")).toContain(
      "Answer: 入れない\n  -> picked option 2, not the recommended one (recommended: option 1)\nUser said: 返金の扱いは別の機会に、もう少し選択肢がほしい",
    );
    expect(block(out, "Question: 在庫の戻し方は？")).toContain(
      "Answer: (the user replied in their own words instead of picking)\nUser said: その前に、在庫の引き当てがいつ行われるかを確認したい",
    );
    for (const boilerplate of [
      "Read the answers carefully",
      "You can now continue",
      "No response after",
      "Before going idle",
      "Proceed using your best judgment",
      "So far they answered",
      "They also wrote",
      "The user responded",
      "The user answered",
      "Answer (as recorded)",
    ]) {
      expect(out, boilerplate).not.toContain(boilerplate);
    }
  });

  it("does not take a question=answer inside a preview as the answer (text only)", () => {
    expect(block(out, "Question 2 of 3: 試行の記録は、どこに置く？")).toContain(
      'Answer: 注文の表の列（status="retrying"）\n  -> picked option 2, not the recommended one (recommended: option 1)',
    );
    expect(out).not.toContain("見本の続き");
  });
});

describe("prep.mjs structured answers", () => {
  let out: string;

  beforeAll(async () => {
    out = (
      await run([
        join(
          here,
          "__fixtures__",
          "claude",
          "aaaaaaaa-0000-4000-8000-000000000003.jsonl",
        ),
      ])
    ).stdout;
  });

  it("reads answers from the structured result first", () => {
    expect(block(out, "Question 1 of 2: 再試行の対象は？")).toContain(
      "Answer: タイムアウト (Recommended), 残高不足 (not recommended)\n  -> picked options 1, 2,",
    );
    expect(block(out, "Question 2 of 2: 設定の変え方は？")).toContain(
      "Answer: 直接書き換える（非推奨）\n  -> picked option 2,",
    );
    expect(block(out, "Question 2 of 2: 設定の変え方は？")).toContain(
      "User note: 急ぎのときだけ",
    );
    expect(
      block(out, "Question 1 of 3: 決済の再試行は、どの層に入れる？"),
    ).toContain(
      "Answer: 決済サービスの層 (Recommended)\n  -> picked the recommended option\nUser note: 外部決済の部分は別の担当が持っているため\n",
    );
    expect(block(out, "Question 3 of 3: 再試行の待ち時間は？")).toContain(
      "Answer: 最初は 2 秒、以後は倍、最大 30 秒\n  -> answered in the user's own words (not one of the options)",
    );
    expect(out).toContain("Answered questions: 6");
    expect(out).not.toContain("User selected answers");
    expect(out).not.toContain("Answer (as recorded)");
  });

  it("does not take a question=answer inside a preview as the answer (structured)", () => {
    expect(block(out, "Question 2 of 3: 記録の粒度は？")).toContain(
      "Answer: 試行ごとに 1 行\n  -> picked option 2, not the recommended one (recommended: option 1)",
    );
    expect(out).not.toContain("PREVIEW-BODY-THREE");
    expect(out).not.toContain("見本の終わり");
  });

  it("does not treat a negated recommendation as recommended", () => {
    expect(block(out, "Question 1 of 2: 再試行の対象は？")).toContain(
      "  -> picked options 1, 2, not only the recommended ones (recommended: option 1)",
    );
    expect(block(out, "Question 2 of 2: 設定の変え方は？")).toContain(
      "  -> picked option 2, not the recommended one (recommended: option 1)",
    );
  });

  it("shows when each question was asked and answered", () => {
    expect(out).toContain(
      "### AI asked the user (asked 2026-03-02 23:59 UTC, answered 2026-03-03 00:01 UTC)\nQuestion: 今夜のうちに出す？",
    );
    expect(out).toContain(
      "### AI asked the user (asked 2026-03-02 23:52 UTC, answered 2026-03-02 23:53 UTC)",
    );
  });
});

describe("prep.mjs secret shapes", () => {
  const dir = mkdtempSync(join(tmpdir(), "prep-secrets-"));
  const v = (...parts: string[]) => parts.join("");
  let out: string;

  beforeAll(async () => {
    const lines = [
      `API_KEY=${v("fake", "value", "0001")}`,
      `TOKEN=${v("fake", "token", "0002")}`,
      `PASSWORD=${v("fake", "pass", "0003")}`,
      `SECRET_KEY=${v("fake", "secret", "0004")}`,
      `ACCESS_KEY=${v("fake", "access", "0005")}`,
      `SECRET_KEY_BASE=${v("fake", "base", "0006")}`,
      `SERVICE_TOKEN=${v("abc123", ":", "def456")}`,
      `SERVICE_TOKEN="${v("abc 123", ":", "ghi789")}"`,
      `DB_PASSWORD: ${v("fake", "yaml", "0007")}`,
      `{"API_KEY": "${v("fake-json", "-0008")}"}`,
      `password: ${v("hunter", "22fake")}`,
      `stripe ${v("sk_", "test_", "0000example0000fake")}`,
      `Authorization: Bearer ${v("fakebearer", "value0000")}`,
      `db postgres://app:${v("fake", "pass09")}@db.internal:5432/shop`,
      `pat ${v("github_pat_", "FAKE0000example0000xx")}`,
      `slack ${v("xox", "b-0000-fake-example")}`,
      `google ${v("AIza", "0000fakeexample0000fakeexample00000")}`,
      "MAX_TOKENS: 4096",
      "TOKEN_LIMIT=100000",
      "token の数え方を変える",
      "password の欄を足す",
      "see https://example.com/docs?page=2",
      "const token = await getToken();",
      "password: string;",
    ];
    const id = "cccccccc-0000-4000-8000-000000000001";
    const file = join(dir, `${id}.jsonl`);
    writeFileSync(
      file,
      JSON.stringify({
        parentUuid: null,
        isSidechain: false,
        userType: "external",
        cwd: "/workspace/example-shop",
        sessionId: id,
        type: "user",
        message: { role: "user", content: lines.join("\n") },
        uuid: "dddddddd-0000-4000-8000-000000000001",
        timestamp: "2026-03-02T10:00:00.000Z",
      }) + "\n",
    );
    out = (await run([file])).stdout;
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("redacts environment-style assignments in full", () => {
    for (const line of [
      "API_KEY=[REDACTED]",
      "TOKEN=[REDACTED]",
      "PASSWORD=[REDACTED]",
      "SECRET_KEY=[REDACTED]",
      "ACCESS_KEY=[REDACTED]",
      "SECRET_KEY_BASE=[REDACTED]",
      "SERVICE_TOKEN=[REDACTED]",
      "DB_PASSWORD: [REDACTED]",
      '{"API_KEY": [REDACTED]}',
      "password: [REDACTED]",
    ]) {
      expect(out.split("\n"), line).toContain(line);
    }
    for (const leaked of ["def456", "ghi789", "fake-json", "22fake"]) {
      expect(out, leaked).not.toContain(leaked);
    }
  });

  it("redacts each extended secret shape", () => {
    for (const line of [
      "stripe [REDACTED]",
      "Authorization: Bearer [REDACTED]",
      "db postgres://app:[REDACTED]@db.internal:5432/shop",
      "pat [REDACTED]",
      "slack [REDACTED]",
      "google [REDACTED]",
    ]) {
      expect(out.split("\n"), line).toContain(line);
    }
  });

  it("leaves ordinary text that only looks like a secret", () => {
    for (const line of [
      "MAX_TOKENS: 4096",
      "TOKEN_LIMIT=100000",
      "token の数え方を変える",
      "password の欄を足す",
      "see https://example.com/docs?page=2",
      "const token = await getToken();",
      "password: string;",
    ]) {
      expect(out.split("\n"), line).toContain(line);
    }
  });
});
