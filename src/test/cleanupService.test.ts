import test from "node:test";
import assert from "node:assert/strict";

import { CleanupService } from "../cleanupService";
import type { CleanupConfig, CleanupLogger, RecentEntry, RecentStore } from "../types";

class MemoryLogger implements CleanupLogger {
  public readonly messages: string[] = [];

  public info(message: string): void {
    this.messages.push(message);
  }

  public warn(message: string, error?: unknown): void {
    this.messages.push(error ? `${message} ${String(error)}` : message);
  }
}

function createEntry(matchValue: string): RecentEntry {
  return {
    kind: "file",
    matchValue,
    removeValue: matchValue,
    label: matchValue
  };
}

function createConfig(overrides: Partial<CleanupConfig> = {}): CleanupConfig {
  return {
    enabled: true,
    rules: ["**/private/**"],
    runOnStartup: true,
    runOnShutdown: true,
    debugLogging: false,
    ...overrides
  };
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}

test("removes only matching entries", async () => {
  const logger = new MemoryLogger();
  const removed: string[] = [];
  const store: RecentStore = {
    async listEntries() {
      return [createEntry("/workspace/private/a.txt"), createEntry("/workspace/public/b.txt")];
    },
    async removeEntry(entry) {
      removed.push(entry.removeValue);
    }
  };

  const service = new CleanupService({
    getConfig: () => createConfig(),
    logger,
    store,
    platform: "linux"
  });

  const summary = await service.run("startup");

  assert.equal(summary.status, "completed");
  assert.deepEqual(removed, ["/workspace/private/a.txt"]);
});

test("skips cleanup when no rules are configured", async () => {
  const logger = new MemoryLogger();
  const store: RecentStore = {
    async listEntries() {
      return [createEntry("/workspace/private/a.txt")];
    },
    async removeEntry() {
      throw new Error("should not remove");
    }
  };

  const service = new CleanupService({
    getConfig: () => createConfig({ rules: [] }),
    logger,
    store
  });

  const summary = await service.run("startup");

  assert.equal(summary.status, "skipped-no-rules");
});

test("skips startup cleanup when startup is disabled", async () => {
  const logger = new MemoryLogger();
  let listed = false;
  const store: RecentStore = {
    async listEntries() {
      listed = true;
      return [];
    },
    async removeEntry() {
      throw new Error("should not remove");
    }
  };

  const service = new CleanupService({
    getConfig: () => createConfig({ runOnStartup: false }),
    logger,
    store
  });

  const summary = await service.run("startup");

  assert.equal(summary.status, "skipped-config");
  assert.equal(listed, false);
});

test("manual cleanup ignores startup toggle", async () => {
  const logger = new MemoryLogger();
  const removed: string[] = [];
  const store: RecentStore = {
    async listEntries() {
      return [createEntry("/workspace/private/a.txt")];
    },
    async removeEntry(entry) {
      removed.push(entry.removeValue);
    }
  };

  const service = new CleanupService({
    getConfig: () => createConfig({ runOnStartup: false }),
    logger,
    store
  });

  const summary = await service.run("manual");

  assert.equal(summary.status, "completed");
  assert.deepEqual(removed, ["/workspace/private/a.txt"]);
});

test("fails cleanup when recent entries cannot be read", async () => {
  const logger = new MemoryLogger();
  const store: RecentStore = {
    async listEntries() {
      throw new Error("command missing");
    },
    async removeEntry() {
      throw new Error("should not remove");
    }
  };

  const service = new CleanupService({
    getConfig: () => createConfig(),
    logger,
    store
  });

  const summary = await service.run("startup");

  assert.equal(summary.status, "failed");
});

test("continues when one removal fails", async () => {
  const logger = new MemoryLogger();
  const removed: string[] = [];
  const store: RecentStore = {
    async listEntries() {
      return [createEntry("/workspace/private/a.txt"), createEntry("/workspace/private/b.txt")];
    },
    async removeEntry(entry) {
      if (entry.removeValue.endsWith("a.txt")) {
        throw new Error("boom");
      }

      removed.push(entry.removeValue);
    }
  };

  const service = new CleanupService({
    getConfig: () => createConfig(),
    logger,
    store,
    platform: "linux"
  });

  const summary = await service.run("startup");

  assert.equal(summary.status, "failed");
  assert.equal(summary.failedEntries, 1);
  assert.deepEqual(removed, ["/workspace/private/b.txt"]);
});

test("deduplicates matching entries before removal", async () => {
  const logger = new MemoryLogger();
  const removed: string[] = [];
  const duplicate = createEntry("/workspace/private/a.txt");
  const store: RecentStore = {
    async listEntries() {
      return [duplicate, { ...duplicate }];
    },
    async removeEntry(entry) {
      removed.push(entry.removeValue);
    }
  };

  const service = new CleanupService({
    getConfig: () => createConfig(),
    logger,
    store
  });

  await service.run("startup");

  assert.deepEqual(removed, ["/workspace/private/a.txt"]);
});

test("coalesces concurrent runs into a single in-flight execution", async () => {
  const logger = new MemoryLogger();
  const listGate = deferred<RecentEntry[]>();
  let listCalls = 0;
  const store: RecentStore = {
    async listEntries() {
      listCalls += 1;
      return listGate.promise;
    },
    async removeEntry() {
      return;
    }
  };

  const service = new CleanupService({
    getConfig: () => createConfig(),
    logger,
    store
  });

  const firstRun = service.run("startup");
  const secondRun = service.run("manual");
  listGate.resolve([createEntry("/workspace/private/a.txt")]);

  const [firstSummary, secondSummary] = await Promise.all([firstRun, secondRun]);

  assert.equal(listCalls, 1);
  assert.deepEqual(firstSummary, secondSummary);
});
