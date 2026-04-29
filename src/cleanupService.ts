import { matchesRecentEntry } from "./matcher";
import type {
  CleanupConfig,
  CleanupLogger,
  CleanupReason,
  CleanupSummary,
  RecentEntry,
  RecentStore
} from "./types";

export interface CleanupServiceOptions {
  getConfig(): CleanupConfig;
  logger: CleanupLogger;
  store: RecentStore;
  platform?: NodeJS.Platform;
}

function dedupeEntries(entries: RecentEntry[]): RecentEntry[] {
  const seen = new Set<string>();
  const uniqueEntries: RecentEntry[] = [];

  for (const entry of entries) {
    if (seen.has(entry.removeValue)) {
      continue;
    }

    seen.add(entry.removeValue);
    uniqueEntries.push(entry);
  }

  return uniqueEntries;
}

function shouldRunForReason(config: CleanupConfig, reason: CleanupReason): boolean {
  if (reason === "startup") {
    return config.runOnStartup;
  }

  if (reason === "shutdown") {
    return config.runOnShutdown;
  }

  return true;
}

function createSummary(
  reason: CleanupReason,
  status: CleanupSummary["status"],
  message: string,
  totalEntries = 0,
  matchedEntries = 0,
  removedEntries = 0,
  failedEntries = 0
): CleanupSummary {
  return {
    reason,
    status,
    totalEntries,
    matchedEntries,
    removedEntries,
    failedEntries,
    message
  };
}

export function formatSummary(summary: CleanupSummary): string {
  return `[${summary.reason}] ${summary.message}`;
}

export class CleanupService {
  private currentRun?: Promise<CleanupSummary>;

  private readonly platform: NodeJS.Platform;

  public constructor(private readonly options: CleanupServiceOptions) {
    this.platform = options.platform ?? process.platform;
  }

  public run(reason: CleanupReason): Promise<CleanupSummary> {
    if (this.currentRun) {
      return this.currentRun;
    }

    const runPromise = this.doRun(reason).finally(() => {
      if (this.currentRun === runPromise) {
        this.currentRun = undefined;
      }
    });

    this.currentRun = runPromise;
    return runPromise;
  }

  private async doRun(reason: CleanupReason): Promise<CleanupSummary> {
    const config = this.options.getConfig();

    if (!config.enabled) {
      const summary = createSummary(reason, "skipped-disabled", "cleanup skipped because the extension is disabled.");
      this.options.logger.info(formatSummary(summary));
      return summary;
    }

    if (!shouldRunForReason(config, reason)) {
      const summary = createSummary(reason, "skipped-config", `cleanup skipped because ${reason} execution is disabled.`);
      this.options.logger.info(formatSummary(summary));
      return summary;
    }

    if (config.rules.length === 0) {
      const summary = createSummary(reason, "skipped-no-rules", "cleanup skipped because no rules are configured.");
      this.options.logger.info(formatSummary(summary));
      return summary;
    }

    try {
      const entries = await this.options.store.listEntries();
      const matchedEntries = dedupeEntries(
        entries.filter((entry) => matchesRecentEntry(entry, config.rules, this.platform))
      );

      if (config.debugLogging) {
        this.options.logger.info(
          formatSummary(
            createSummary(
              reason,
              "completed",
              `loaded ${entries.length} recent entries and matched ${matchedEntries.length} entries.`,
              entries.length,
              matchedEntries.length
            )
          )
        );

        for (const entry of matchedEntries) {
          this.options.logger.info(`[${reason}] match (${entry.kind}): ${entry.label}`);
        }
      }

      let removedEntries = 0;
      let failedEntries = 0;

      for (const entry of matchedEntries) {
        try {
          await this.options.store.removeEntry(entry);
          removedEntries += 1;
        } catch (error) {
          failedEntries += 1;
          this.options.logger.warn(`[${reason}] failed to remove recent entry: ${entry.label}`, error);
        }
      }

      const summary = createSummary(
        reason,
        failedEntries > 0 ? "failed" : "completed",
        `processed ${entries.length} recent entries, matched ${matchedEntries.length}, removed ${removedEntries}, failed ${failedEntries}.`,
        entries.length,
        matchedEntries.length,
        removedEntries,
        failedEntries
      );

      this.options.logger.info(formatSummary(summary));
      return summary;
    } catch (error) {
      const summary = createSummary(reason, "failed", `cleanup failed: ${error instanceof Error ? error.message : String(error)}.`);
      this.options.logger.warn(formatSummary(summary), error);
      return summary;
    }
  }
}
