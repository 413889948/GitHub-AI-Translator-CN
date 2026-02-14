# AGENTS.md - GitHub-AI-Translator-CN 代理协作指南

本文档供在本仓库执行任务的 AI 代理使用，目标是统一工程习惯、降低回归风险。

## 1. 项目概览
- 项目类型：Chrome Extension (Manifest V3)，无打包构建步骤。
- 技术栈：原生 JavaScript、HTML、CSS。
- 入口文件：`manifest.json`。
- 核心模块：
  - `popup.js`：弹窗 UI，读取配置并触发翻译。
  - `content.js`：注入 GitHub 页面，执行翻译和 UI 控制。
  - `background.js`：Service Worker，处理 API 调用和消息中转。
- 调用链路：Popup -> Content Script -> Background -> 翻译 API。

## 2. Build / Lint / Test

当前仓库没有 `package.json`，无 npm scripts；采用“手动运行 + 语法检查”。

### 2.1 Build（构建）
- 无构建命令。
- 修改后在 `chrome://extensions/` 点击扩展“重新加载”即生效。

### 2.2 Run（本地运行）
1. 打开 `chrome://extensions/`。
2. 开启开发者模式。
3. 点击“加载已解压的扩展程序”，选择仓库根目录。
4. 每次改动后重载扩展并刷新目标 GitHub 页面。

### 2.3 Lint（可执行检查）
仓库未配置 ESLint。提交前至少执行：

```bash
node --check background.js
node --check content.js
node --check popup.js
```

校验 `manifest.json` 合法性：

```bash
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest ok')"
```

### 2.4 Test（测试）
- 自动化测试：未配置（无 Jest/Vitest/Mocha）。
- 默认测试策略：手动 E2E 验证。

最小手动用例：
1. 打开任意 GitHub README 页面（如 `https://github.com/facebook/react`）。
2. 打开插件弹窗，选择翻译引擎。
3. 若使用 MiniMax，填写并保存 API Key。
4. 选择翻译模式并启动翻译。
5. 验证：控制台显示进度、暂停/继续可用、原文/译文可切换、失败时有可读错误提示。

### 2.5 单个测试如何运行（重点）
- 当前无测试框架，**没有真实“单测命令”**。
- 可替代方式：
  - 单文件语法检查：`node --check content.js`
  - 单场景手工验证：仅验证“`translateDocs` 消息触发翻译流程”。
- 如后续引入 Jest，约定单测命令：

```bash
npm test -- path/to/test-file.test.js
```

## 3. 代码风格规范

### 3.1 格式化
- JavaScript：4 空格缩进。
- JSON：2 空格缩进。
- 语句末尾必须加分号。
- 建议行宽 <= 120。
- 逻辑段之间保留空行，避免大段连续代码。

### 3.2 引号与字符串
- `manifest.json` 必须双引号（JSON 标准）。
- JavaScript 保持“文件内一致优先”：
  - `background.js` 以双引号风格为主。
  - `popup.js`/`content.js` 以单引号风格为主。
- 不做无意义全文件引号切换。
- 仅在需要插值/多行时使用模板字符串。

### 3.3 Imports 与模块边界
- 当前不使用 ES Modules import/export。
- 不引入依赖打包器的语法。
- 不在浏览器运行路径使用 Node 专属 API。
- 复用逻辑优先同文件抽函数，保持依赖简单可追踪。

### 3.4 类型约束
- 项目为 JavaScript，未启用 TypeScript。
- 对消息对象采用“结构约定 + 运行时校验”：`{ action, text, apiKey, mode, config }`。
- 对 API 返回采用防御式访问，避免空值崩溃。
- 复杂函数可补充简短 JSDoc（参数/返回值）。

### 3.5 命名规范
- 变量、函数：`camelCase`。
- 常量：`UPPER_SNAKE_CASE`（如 `MINIMAX_API_URL`）。
- 布尔变量优先 `is/has/can/should` 前缀（如 `isPaused`）。
- 文件名保持小写风格并与现有命名一致。

### 3.6 异步与消息通信
- 优先 `async/await`，避免不必要 Promise 链。
- 所有网络请求必须 `try...catch`。
- 异步回包时必须在监听器里 `return true`。
- 控制并发数量，避免无上限 `Promise.all` 冲击 API。

### 3.7 错误处理
- 使用 `console.error` 记录原始错误对象。
- 统一错误返回结构：`{ success: false, error: "..." }`。
- UI 层必须展示可理解错误，不能静默失败。
- 失败后要恢复可操作状态，避免按钮/状态锁死。

### 3.8 DOM 与安全
- DOM 查询应限定在 README 容器（`.markdown-body` 或 `#readme`）。
- 避免处理代码块文本（`pre/code`）。
- 注入 HTML 前优先转义（如 `escapeHtml`）。
- 禁止硬编码 API Key 或其他敏感信息。

## 4. Manifest 与权限
- 维持 MV3 结构：`background.service_worker`。
- 权限遵循最小化原则，仅申请必要权限。
- 变更 `permissions` / `host_permissions` 时需说明原因与影响。

## 5. 分文件回归重点
- 改 `background.js`：检查监听器是否顶层注册、异步响应是否闭环。
- 改 `content.js`：检查暂停/恢复、原文/译文切换、长文档性能。
- 改 `popup.js`：检查配置读写、内容脚本注入兜底逻辑。
- 改 `manifest.json`：检查扩展能否正常重载、脚本是否正确注入。

## 6. Git 与提交纪律
- 不提交 API Key、token、账号信息。
- 避免“纯格式化改动”与功能改动混在同一提交。
- 变更说明应包含：行为变化、潜在风险、验证步骤。
- 未明确要求时，不执行破坏性 git 操作。

## 7. Cursor / Copilot 规则状态
已检查：
- `.cursor/rules/`
- `.cursorrules`
- `.github/copilot-instructions.md`

当前仓库未发现上述规则文件。

执行约定：
- 若未来新增这些规则文件，其优先级高于本文件通用建议。
- 代理开始改动前应先读取并合并新规则，再执行任务。
