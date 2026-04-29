export type CleanupReason = "startup" | "shutdown" | "manual";

export type RecentKind = "file" | "folder" | "workspace";

export type CleanupStatus =
  | "completed"
  | "skipped-disabled"
  | "skipped-no-rules"
  | "skipped-config"
  | "skipped-unavailable"
  | "failed";

export interface CleanupConfig {
  enabled: boolean;
  rules: string[];
  runOnStartup: boolean;
  runOnShutdown: boolean;
  debugLogging: boolean;
}

export interface RecentEntry {
  kind: RecentKind;
  matchValue: string;
  removeValue: string;
  label: string;
}

export interface CleanupSummary {
  reason: CleanupReason;
  status: CleanupStatus;
  totalEntries: number;
  matchedEntries: number;
  removedEntries: number;
  failedEntries: number;
  message: string;
}

export interface CleanupLogger {
  info(message: string): void;
  warn(message: string, error?: unknown): void;
}

export interface RecentStore {
  commandsAvailable(): Promise<boolean>;
  listEntries(): Promise<RecentEntry[]>;
  removeEntry(entry: RecentEntry): Promise<void>;
}
