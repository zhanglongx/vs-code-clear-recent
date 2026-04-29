import * as vscode from "vscode";

import { getCleanupConfig } from "./config";
import { CleanupService } from "./cleanupService";
import { VsCodeRecentStore } from "./vscodeRecentStore";
import type { CleanupLogger } from "./types";

class OutputLogger implements CleanupLogger {
  public constructor(private readonly output: vscode.OutputChannel) {}

  public info(message: string): void {
    this.output.appendLine(message);
  }

  public warn(message: string, error?: unknown): void {
    this.output.appendLine(message);
    if (error instanceof Error) {
      this.output.appendLine(error.stack ?? error.message);
      return;
    }

    if (error !== undefined) {
      this.output.appendLine(String(error));
    }
  }
}

let cleanupService: CleanupService | undefined;

async function runManualCleanup(): Promise<void> {
  if (!cleanupService) {
    return;
  }

  const summary = await cleanupService.run("manual");

  if (summary.status === "failed") {
    void vscode.window.showErrorMessage(`Clear Recent: ${summary.message}`);
    return;
  }

  void vscode.window.showInformationMessage(`Clear Recent: ${summary.message}`);
}

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("Clear Recent");
  const logger = new OutputLogger(output);
  const store = new VsCodeRecentStore(logger);

  cleanupService = new CleanupService({
    getConfig: getCleanupConfig,
    logger,
    store
  });

  context.subscriptions.push(output);
  context.subscriptions.push(
    vscode.commands.registerCommand("clearRecent.runNow", async () => {
      await runManualCleanup();
    })
  );

  logger.info("[startup] Clear Recent activated.");
  void cleanupService.run("startup");
}

export async function deactivate(): Promise<void> {
  if (!cleanupService) {
    return;
  }

  await cleanupService.run("shutdown");
}
