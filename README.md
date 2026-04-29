# Clear Recent

`Clear Recent` is a privately distributed VS Code extension that removes entries from VS Code's recently opened list based on configured matching rules.

It only removes VS Code's internal recent entries. It does not delete any files, folders, or workspace files from disk.

## Features

- Automatically runs after VS Code startup finishes
- Performs a best-effort cleanup when the extension is deactivated
- Provides a `Clear Recent: Run Now` command for manual verification
- Uses glob rules to match recent file, folder, and `.code-workspace` entries
- Works on Windows, Linux, and macOS

## Configuration

```json
{
  "clearRecent.enabled": true,
  "clearRecent.rules": [
    "**/private/**",
    "/home/alice/tmp/**",
    "C:/Users/alice/work/**",
    "**/*.code-workspace"
  ],
  "clearRecent.runOnStartup": true,
  "clearRecent.runOnShutdown": true,
  "clearRecent.debugLogging": false
}
```

Rule notes:

- Always use `/` as the path separator for cross-platform configuration
- Recent file and folder entries are matched against absolute paths
- Recent workspace entries are matched against the `.code-workspace` file path
- Non-`file:` URIs are matched against the full URI string
- Matching is case-insensitive on Windows and case-sensitive on Linux and macOS

## Commands

- `Clear Recent: Run Now`

## Development

```bash
npm install
npm run compile
npm test
```

Package a private VSIX:

```bash
npm run package:vsix
```

Then install the generated `.vsix` file in VS Code.
