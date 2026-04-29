import * as vscode from "vscode";

import type { CleanupConfig } from "./types";

const CONFIG_NAMESPACE = "clearRecent";

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function sanitizeRules(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .filter((rule): rule is string => typeof rule === "string")
    .map((rule) => rule.trim())
    .filter((rule) => rule.length > 0);

  return [...new Set(normalized)];
}

export function getCleanupConfig(): CleanupConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);

  return {
    enabled: asBoolean(config.get("enabled"), true),
    rules: sanitizeRules(config.get("rules")),
    runOnStartup: asBoolean(config.get("runOnStartup"), true),
    runOnShutdown: asBoolean(config.get("runOnShutdown"), true),
    debugLogging: asBoolean(config.get("debugLogging"), false)
  };
}
