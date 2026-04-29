# Clear Recent

`Clear Recent` 是一个私有分发的 VS Code 扩展，用于按照配置规则清理 VS Code 的“最近打开”记录。

它只删除 VS Code 内部的 recent 记录，不会删除磁盘上的任何文件、文件夹或 workspace 文件。

## Features

- 在 VS Code 启动完成后自动清理
- 在扩展停用时做一次 best-effort 清理
- 提供 `Clear Recent: Run Now` 手动命令便于验证
- 使用 glob 规则匹配文件、文件夹和 `.code-workspace` recent 项
- 跨平台支持 Windows、Linux、macOS

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

规则说明：

- 统一使用 `/` 作为路径分隔符，便于跨平台配置
- 文件和文件夹 recent 项按绝对路径匹配
- workspace recent 项按 `.code-workspace` 文件路径匹配
- 非 `file:` URI 按完整 URI 字符串匹配
- Windows 按不区分大小写匹配；Linux/macOS 按区分大小写匹配

## Commands

- `Clear Recent: Run Now`

## Development

```bash
npm install
npm run compile
npm test
```

打包私有 VSIX：

```bash
npm run package:vsix
```

然后使用 VS Code 安装生成的 `.vsix` 文件即可。
