# 治画

AI 驱动的文生图画布工具。输入自然语言描述，自动拆解为独立元素并生成图片，在 LeaferJS 画布上自由编排。

## 工作流程

```
用户输入文字描述
  → genText (LLM 拆解为元素列表：主体 + 背景)
    → genImage (为每个元素生成带透明背景的图片)
      → 叠加到 LeaferJS 画布
        → genLog (记录日志到 SQLite)
```

## 项目结构

```
canvas-image/                  # Vue 3 前端
├── .env                       # VITE_API_BASE
├── src/
│   └── components/
│       └── ImageCanvas.vue    # 主画布组件 + 历史记录弹框

agent/                        # Express 后端
├── .env.example
├── src/
│   ├── index.ts              # 服务入口 + 路由
│   ├── config.ts             # 环境配置
│   ├── response.ts           # API 响应工具
│   └── services/
│       ├── db.ts             # SQLite 初始化 + 插入/查询日志
│       ├── genText.ts        # LLM 文本拆解服务
│       └── genImage.ts       # 图片生成服务 (SiliconFlow)
```

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/genText` | LLM 拆解文本为元素列表 |
| POST | `/genImage` | 为元素生成图片 |
| POST | `/genLog` | 记录生成日志到数据库 |
| GET  | `/getLogs` | 分页查询历史日志 |

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp agent/.env.example agent/.env
```

编辑 `agent/.env`：

| 变量 | 说明 |
|---|---|
| `PORT` | 服务端口 (默认 3000) |
| `IMAGE_KEY` | SiliconFlow API Key |
| `TEXT_KEY` | OpenRouter API Key |
| `TEXT_URL` | OpenRouter API URL |

前端 `VITE_API_BASE` 配置在根目录 `.env`，开发环境下留空即可（代理到同域）。

### 3. 启动

```bash
# 一键启动前端 + 后端
pnpm dev
```

打开 `http://localhost:5173` 即可使用。

### 生产构建

```bash
pnpm --filter agent build    # 构建后端 (自包含，输出到 agent/dist)
pnpm build                   # 构建前端到 dist/
```

部署时将 `agent/dist/` 复制到服务器，运行 `node dist/index.js` 即可（无需额外安装依赖）。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | Vue 3 + TypeScript |
| 画布 | LeaferJS + leafer-editor |
| 后端 | Express 5 |
| 数据库 | SQLite (sql.js) |
| AI 文本 | OpenRouter (Vercel AI SDK) |
| AI 图片 | SiliconFlow (Kwai-Kolors/Kolors) |
| 包管理 | pnpm workspace |
