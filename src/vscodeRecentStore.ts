import * as vscode from "vscode";

import type { CleanupLogger, RecentEntry, RecentKind, RecentStore } from "./types";

const GET_RECENTS_COMMAND = "_workbench.getRecentlyOpened";
const REMOVE_RECENT_COMMAND = "vscode.removeFromRecentlyOpened";

interface UriLike {
  scheme: string;
  authority?: string;
  path: string;
  query?: string;
  fragment?: string;
}

interface RawRecentFile {
  fileUri?: vscode.Uri | UriLike;
  label?: string;
}

interface RawRecentFolder {
  folderUri?: vscode.Uri | UriLike;
  label?: string;
}

interface RawRecentWorkspace {
  workspace?: {
    id?: string;
    configPath?: vscode.Uri | UriLike;
  };
  label?: string;
}

interface RawRecentlyOpened {
  files?: RawRecentFile[];
  workspaces?: Array<RawRecentFolder | RawRecentWorkspace>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toUri(value: unknown): vscode.Uri | undefined {
  if (value instanceof vscode.Uri) {
    return value;
  }

  if (isObject(value) && typeof value.scheme === "string" && typeof value.path === "string") {
    return vscode.Uri.from({
      scheme: value.scheme,
      authority: typeof value.authority === "string" ? value.authority : "",
      path: value.path,
      query: typeof value.query === "string" ? value.query : "",
      fragment: typeof value.fragment === "string" ? value.fragment : ""
    });
  }

  return undefined;
}

function isWorkspaceRecent(value: RawRecentFolder | RawRecentWorkspace): value is RawRecentWorkspace {
  return isObject(value) && "workspace" in value;
}

function toMatchValue(uri: vscode.Uri): string {
  return uri.scheme === "file" ? uri.fsPath : uri.toString();
}

function toRemoveValue(uri: vscode.Uri): string {
  return uri.scheme === "file" ? uri.fsPath : uri.toString();
}

function createEntry(kind: RecentKind, uri: vscode.Uri, label?: string): RecentEntry {
  const fallbackLabel = toMatchValue(uri);

  return {
    kind,
    matchValue: toMatchValue(uri),
    removeValue: toRemoveValue(uri),
    label: label?.trim() || fallbackLabel
  };
}

function adaptRawRecents(raw: unknown): RecentEntry[] {
  if (!isObject(raw)) {
    throw new Error("Unexpected recently opened payload.");
  }

  const payload = raw as RawRecentlyOpened;
  const entries: RecentEntry[] = [];

  for (const file of payload.files ?? []) {
    const uri = toUri(file.fileUri);
    if (!uri) {
      continue;
    }

    entries.push(createEntry("file", uri, file.label));
  }

  for (const workspace of payload.workspaces ?? []) {
    if (isWorkspaceRecent(workspace)) {
      const uri = toUri(workspace.workspace?.configPath);
      if (!uri) {
        continue;
      }

      entries.push(createEntry("workspace", uri, workspace.label));
      continue;
    }

    const uri = toUri(workspace.folderUri);
    if (!uri) {
      continue;
    }

    entries.push(createEntry("folder", uri, workspace.label));
  }

  return entries;
}

export class VsCodeRecentStore implements RecentStore {
  public constructor(private readonly logger: CleanupLogger) {}

  public async listEntries(): Promise<RecentEntry[]> {
    try {
      const rawRecents = await vscode.commands.executeCommand<unknown>(GET_RECENTS_COMMAND);
      return adaptRawRecents(rawRecents);
    } catch (error) {
      this.logger.warn(`Failed to read recently opened entries via ${GET_RECENTS_COMMAND}.`, error);
      throw new Error(`Unable to read recently opened entries via ${GET_RECENTS_COMMAND}.`);
    }
  }

  public async removeEntry(entry: RecentEntry): Promise<void> {
    try {
      await vscode.commands.executeCommand(REMOVE_RECENT_COMMAND, entry.removeValue);
    } catch (error) {
      this.logger.warn(`Failed to remove recent entry via ${REMOVE_RECENT_COMMAND}: ${entry.label}`, error);
      throw new Error(`Unable to remove recent entry: ${entry.label}.`);
    }
  }
}
