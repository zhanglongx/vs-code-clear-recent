import assert from "node:assert/strict";

import * as vscode from "vscode";

describe("Clear Recent extension", () => {
  it("registers the manual command", async () => {
    const extension = vscode.extensions.getExtension("zhlx.vs-code-clear-recent");
    assert.ok(extension, "Expected the extension to be installed in the test host.");

    await extension.activate();

    const commands = await vscode.commands.getCommands(true);
    assert.equal(commands.includes("clearRecent.runNow"), true);
  });

  it("can execute the recently opened read command", async () => {
    const recent = await vscode.commands.executeCommand<{ files?: unknown[]; workspaces?: unknown[] }>("_workbench.getRecentlyOpened");
    assert.ok(recent && typeof recent === "object");
  });
});
