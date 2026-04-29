import { minimatch } from "minimatch";

import type { RecentEntry } from "./types";

function normalizePathSeparators(value: string): string {
  return value.replace(/\\/g, "/");
}

export function normalizeRule(rule: string): string {
  return normalizePathSeparators(rule.trim());
}

export function normalizeMatchValue(value: string, platform: NodeJS.Platform): string {
  const normalized = normalizePathSeparators(value);
  return platform === "win32" ? normalized.toLowerCase() : normalized;
}

export function matchesRecentEntry(
  entry: RecentEntry,
  rules: string[],
  platform: NodeJS.Platform = process.platform
): boolean {
  const target = normalizeMatchValue(entry.matchValue, platform);

  return rules.some((rule) => {
    const normalizedRule = normalizeMatchValue(normalizeRule(rule), platform);

    return minimatch(target, normalizedRule, {
      dot: true,
      nocomment: true,
      nonegate: true,
      nocase: platform === "win32"
    });
  });
}
