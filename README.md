# GitHub-AI-Translator-CN (GitHub 文档翻译器)

[![Chrome 扩展程序](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)
[![版本](https://img.shields.io/badge/Version-1.0-blue.svg)](./manifest.json)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)

GitHub-AI-Translator-CN 是一款 Chrome 扩展程序，使用 AI 模型自动将 GitHub 项目的 README 等文档翻译成简体中文。

## 目录

- [项目简介](#项目简介)
- [功能特点](#功能特点)
- [技术栈](#技术栈)
- [支持的翻译引擎](#支持的翻译引擎)
- [安装与使用](#安装与使用)
- [插件使用视频](#插件使用视频)
- [配置说明](#配置说明)
- [翻译模式](#翻译模式)
- [工作原理](#工作原理)
- [目录结构](#目录结构)
- [API 说明](#api-说明)
- [常见问题](#常见问题)
- [更新日志](#更新日志)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 项目简介

本扩展程序旨在帮助中文开发者更方便地阅读 GitHub 上的英文项目文档。当你在 GitHub 上浏览任意仓库的 README 时，只需点击扩展程序图标，即可一键启动 AI 翻译，将文档内容转换为简体中文。

**注意**：本项目目前仅正式支持 **MiniMax** AI 翻译模型。其他翻译引擎（如 Google Translate、OpenAI、Claude 等）正在积极开发中，敬请期待。

---

## 功能特点

- **一键翻译**：点击扩展图标即可翻译当前页面的 README 文档
- **多种翻译模式**：
  - 逐段精翻：逐个段落翻译，精度高，适合长文档
  - 全文快翻：批量翻译，速度快，适合快速预览
  - 暴力直翻：一次性翻译整个文档，速度最快
- **原文/译文对照**：随时切换查看原文或译文
- **翻译进度显示**：实时显示翻译进度
- **暂停/继续**：支持暂停和继续翻译任务
- **MiniMax AI 驱动**：利用 MiniMax 的强大翻译能力，确保翻译质量
- **保留 HTML 格式**：智能保留代码块、链接、粗体等 HTML 格式

---

## 技术栈

- **扩展程序类型**：Chrome 扩展程序 (Manifest V3)
- **编程语言**：原生 JavaScript
- **前端技术**：HTML5, CSS3
- **后端服务**：Chrome Service Worker
- **API 调用**：MiniMax API (已完成), 其他 API (开发中)

---

## 支持的翻译引擎

### ✅ MiniMax AI (正式支持)

- **模型**：`abab5.5-chat`
- **特点**：翻译质量高，支持 HTML 内容保留
- **需要**：有效的 MiniMax API Key
- **获取 API Key**：访问 [MiniMax 开放平台](https://platform.minimax.cn/) 注册并获取 API Key

### 🔄 Google Translate (开发中)

- **状态**：代码已集成，界面配置中
- **特点**：免费使用，无需 API Key
- **预计**：即将推出

### ⏳ 其他引擎 (规划中)

以下翻译引擎正在规划中，未来版本将陆续支持：

- OpenAI (GPT 系列)
- Anthropic (Claude 系列)
- 百度翻译
- 腾讯翻译
- 有道翻译

---

## 安装与使用

### 安装步骤

1. **下载源码**：克隆或下载本仓库到本地

   ```bash
   git clone https://github.com/your-repo/GitHub-AI-Translator-CN.git
   ```

2. **打开 Chrome 扩展程序页面**

   在 Chrome 浏览器地址栏输入：`chrome://extensions/`

3. **开启开发者模式**

   点击页面右上角的「开发者模式」开关

4. **加载扩展程序**

   点击「加载已解压的扩展程序」按钮，选择本项目根目录

5. **验证安装**

   扩展程序图标应出现在 Chrome 工具栏中

### 使用方法

1. 访问任意 GitHub 仓库页面（如 `https://github.com/facebook/react`）
2. 点击 Chrome 工具栏中的扩展程序图标
3. 配置翻译引擎和 API Key（如使用 MiniMax）
4. 选择翻译模式（精翻/快翻/暴力直翻）
5. 点击「开始 AI 翻译」按钮
6. 翻译控制台将出现在页面右侧，显示翻译进度

### 插件使用视频

> 建议将录制好的视频文件放在 `docs/demo.mp4`，然后在下方直接播放。

<video src="./docs/demo.mp4" controls width="960"></video>

如果仓库不希望存放大文件，可改为外链：

```markdown
[点击观看插件使用演示](https://your-video-link)
```

---

## 配置说明

### MiniMax API Key 配置

1. 点击扩展程序图标打开弹出窗口
2. 点击右上角的「⚙ 设置」按钮
3. 在「翻译引擎」下拉菜单中选择「MiniMax AI」
4. 输入你的 MiniMax API Key
5. 点击「保存配置」按钮

**如何获取 MiniMax API Key**：

1. 访问 [MiniMax 开放平台](https://platform.minimax.cn/)
2. 注册账号并登录
3. 在控制台创建 API Key
4. 复制并粘贴到扩展程序设置中

### 环境变量说明

本扩展程序使用 Chrome 的 `chrome.storage.local` 存储配置：

| 存储键 | 说明 | 必填 |
|--------|------|------|
| `engine` | 翻译引擎类型 (`minimax` / `google`) | 是 |
| `apiKey` | MiniMax API Key | 仅 MiniMax 模式必填 |

---

## 翻译模式

### 1. 逐段精翻 (Stream Mode)

- **特点**：逐个段落依次翻译
- **优点**：精度最高，API 调用稳定
- **缺点**：速度较慢
- **适用场景**：需要高质量翻译的正式文档

### 2. 全文快翻 (Batch Mode)

- **特点**：每次翻译 5 个段落
- **优点**：速度较快，折中方案
- **适用场景**：快速浏览文档内容

### 3. 暴力直翻 (Violence Mode)

- **特点**：将多个段落合并为一个大块进行翻译
- **优点**：速度最快
- **缺点**：可能存在翻译精度问题
- **适用场景**：超长文档的快速预览

---

## 工作原理

### 架构设计

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Popup UI     │────▶│  Background.js   │────▶│   MiniMax API   │
│  (popup.js)    │     │ (Service Worker)│     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  Content Script │◀────│   GitHub Page   │
│   (content.js)  │     │   (DOM  Manipulation)
└─────────────────┘     └──────────────────┘
```

### 组件说明

#### 1. popup.js (弹出窗口)

- 用户界面入口
- 管理翻译引擎选择和 API Key 配置
- 负责保存设置到 `chrome.storage.local`
- 触发翻译任务的启动

#### 2. background.js (后台服务)

- 作为 Chrome Service Worker 运行
- 处理与 MiniMax API 的通信
- 处理与 Google Translate API 的通信（开发中）
- 解决内容脚本的跨域问题

#### 3. content.js (内容脚本)

- 注入到 GitHub 页面
- 负责解析页面 DOM 结构（`.markdown-body`）
- 创建浮动翻译控制台 UI
- 执行实际的 DOM 替换操作
- 支持暂停/继续、原译文切换功能

### 翻译流程

1. 用户在 Popup 中点击「开始翻译」
2. Popup 向当前活动标签页的 Content Script 发送 `translateDocs` 消息
3. Content Script 解析 README 区域的 DOM 元素
4. Content Script 调用 Background 的 API 进行翻译
5. Background 将文本发送给 MiniMax API
6. API 返回翻译结果
7. Content Script 将翻译结果替换到原始 DOM 中
8. 浮动控制台实时显示翻译进度和结果

---

## 目录结构

```
GitHub-AI-Translator-CN/
├── manifest.json          # Chrome 扩展程序清单 (V3)
├── background.js          # 后台 Service Worker (API 调用)
├── content.js            # 内容脚本 (DOM 操作)
├── popup.html            # 弹出窗口 HTML
├── popup.js              # 弹出窗口逻辑
├── AGENTS.md             # AI 代理开发指南
└── README.md             # 项目说明文档
```

### 文件详细说明

| 文件 | 说明 |
|------|------|
| `manifest.json` | 扩展程序配置文件，定义权限、入口点等 |
| `background.js` | 后台服务，处理 MiniMax API 调用 |
| `content.js` | 内容脚本，负责 DOM 操作和翻译 UI |
| `popup.html` | 扩展程序弹出窗口界面 |
| `popup.js` | 弹出窗口交互逻辑 |

---

## API 说明

### MiniMax API

- **端点**：`https://api.minimax.chat/v1/text/chatcompletion_v2`
- **模型**：`abab5.5-chat`
- **请求方式**：POST
- **认证方式**：Bearer Token

#### 请求示例

```javascript
{
  model: "abab5.5-chat",
  max_tokens: 4096,
  messages: [
    {
      role: "system",
      content: "Role: You are a professional technical translator..."
    },
    {
      role: "user",
      content: "<p>Hello World</p>"
    }
  ],
  temperature: 0.1,
  top_p: 0.95
}
```

### System Prompt

扩展程序使用以下系统提示词指导 AI 翻译：

```
Role: You are a professional technical translator.
Task: Translate the provided HTML content into Simplified Chinese (简体中文).
Rules:
1. TARGET LANGUAGE: Simplified Chinese.
2. HTML PRESERVATION: You MUST preserve all HTML tags (<a>, <code>, <b>, <span>, etc.) and their attributes EXACTLY as they appear in the source.
3. CONTENT: Translate the text content inside the tags.
4. TERMINOLOGY: Keep technical terms (e.g., "request", "middleware", "token") in English.
5. OUTPUT: Return ONLY the translated HTML string.
```

---

## 常见问题

### Q1: 翻译失败怎么办？

**解决方案**：
1. 检查 API Key 是否正确
2. 检查网络连接是否正常
3. 尝试切换翻译模式
4. 查看控制台错误信息

### Q2: 为什么翻译速度这么慢？

**原因**：MiniMax API 有速率限制，每次请求之间需要等待一定时间。

**优化建议**：使用「全文快翻」或「暴力直翻」模式可以加快速度。

### Q3: 如何查看原文？

**操作**：翻译过程中或完成后，点击控制台中的「👁 原文」按钮即可查看原始英文内容。

### Q4: 可以翻译其他语言吗？

**当前状态**：目前仅支持英文到简体中文的翻译。

**计划**：未来版本将支持更多语言对。

### Q5: 支持哪些 GitHub 页面？

**支持范围**：
- README.md 页面
- 其他 Markdown 文档页面

**不支持**：
- 代码文件
- Issue/Discussion 页面（非文档区域）

### Q6: 扩展程序不工作怎么办？

**排查步骤**：
1. 确认扩展程序已正确加载
2. 刷新 GitHub 页面
3. 重新点击扩展程序图标
4. 检查是否在 GitHub 仓库页面上

---

## 更新日志

### v1.0 (2024-xx-xx)

- ✅ 首次发布
- ✅ 支持 MiniMax AI 翻译
- ✅ 支持三种翻译模式
- ✅ 支持原文/译文对照
- ✅ 浮动翻译控制台 UI
- 🔄 Google Translate 集成（开发中）
- ⏳ 更多翻译引擎支持（规划中）

---

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/your-feature`)
3. 提交更改 (`git commit -m 'Add some feature'`)
4. 推送分支 (`git push origin feature/your-feature`)
5. 创建 Pull Request

### 开发建议

- 使用 4 空格缩进（与现有代码保持一致）
- 使用 `camelCase` 命名变量和函数
- 使用 `UPPER_SNAKE_CASE` 命名常量
- 所有 API Key 等敏感信息不要硬编码

---

## 许可证

MIT License

---

## 联系方式

- GitHub Issues：https://github.com/your-repo/GitHub-AI-Translator-CN/issues

---

**本项目仅供学习交流使用，请遵守相关服务条款。**
