import test from "node:test";
import assert from "node:assert/strict";

import { matchesRecentEntry, normalizeMatchValue, normalizeRule } from "../matcher";
import type { RecentEntry } from "../types";

function createEntry(matchValue: string): RecentEntry {
  return {
    kind: "file",
    matchValue,
    removeValue: matchValue,
    label: matchValue
  };
}

test("normalizeRule converts backslashes to forward slashes", () => {
  assert.equal(normalizeRule("C:\\Users\\alice\\workspace\\**"), "C:/Users/alice/workspace/**");
});

test("normalizeMatchValue lowercases Windows paths", () => {
  assert.equal(
    normalizeMatchValue("C:\\Users\\Alice\\Workspace\\file.txt", "win32"),
    "c:/users/alice/workspace/file.txt"
  );
});

test("matches exact Linux file path", () => {
  const entry = createEntry("/home/alice/private/secret.txt");

  assert.equal(matchesRecentEntry(entry, ["/home/alice/private/secret.txt"], "linux"), true);
});

test("matches subtree glob", () => {
  const entry = createEntry("/home/alice/private/secret.txt");

  assert.equal(matchesRecentEntry(entry, ["**/private/**"], "linux"), true);
});

test("does not match when no rule applies", () => {
  const entry = createEntry("/home/alice/public/report.txt");

  assert.equal(matchesRecentEntry(entry, ["**/private/**"], "linux"), false);
});

test("matches Windows paths case-insensitively", () => {
  const entry = createEntry("C:\\Users\\Alice\\Work\\Secret\\file.txt");

  assert.equal(matchesRecentEntry(entry, ["c:/users/alice/work/secret/**"], "win32"), true);
});

test("matches workspace files with glob extension rules", () => {
  const entry = createEntry("/home/alice/workspaces/team.code-workspace");

  assert.equal(matchesRecentEntry(entry, ["**/*.code-workspace"], "linux"), true);
});

test("matches non-file URIs using URI string glob", () => {
  const entry = createEntry("vscode-remote://ssh-remote+host/home/alice/project");

  assert.equal(matchesRecentEntry(entry, ["vscode-remote://ssh-remote+host/**"], "linux"), true);
});
