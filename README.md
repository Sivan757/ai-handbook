# 提问、验证与交付

一本写给真实工作场景的 AI 协作与工程实践手册，基于 [VitePress](https://vitepress.dev/) 构建。

- 在线阅读：[https://ai-handbook.kapukapu.cn](https://ai-handbook.kapukapu.cn)

## 内容结构

- **序**：为什么从基本功讲起，以及这本手册怎么读
- **第一章 · 基本功**：提问、搜索、沟通、阅读、学习、笔记与清单
- **第二章 · 模型**：认识模型与 Harness、交代任务、验证结果、安全与边界、知识沉淀
- **第三章 · 编程**：工作流与提示词、Git 与分支、仓库与技能、评审与流水线、复盘与决策
- **附录**：实用模板、阅读书单、视频课表、单文件网页示例与词表

## 本地预览与校验

环境要求：Node.js 20+、pnpm 9+、Python 3。

```bash
pnpm install
pnpm dev              # 本地开发预览
pnpm check            # 运行术语/文风/时效/规范检查、构建站点并校验站内链接与公开范围
```

常用单项脚本：

```bash
pnpm lint             # 术语、禁用词、标点、空格、标题层级、句段长度
pnpm freshness        # 页面复核日期检查
pnpm conventions      # 章节结构与写作规范检查
pnpm run glossary     # 从 tools/glossary.json 重新生成 ai-docs/glossary.md
pnpm build            # 构建静态站点到 docs/.vitepress/dist
python3 tools/check-internal.py   # 构建后检查站内链接与锚点
python3 tools/check-public.py     # 公开前敏感模式扫描
node tools/check-links.mjs        # 外部链接连通性检查（可选）
```

## 部署（Cloudflare Workers Static Assets）

静态站点托管在 Cloudflare Workers（配置见 [wrangler.jsonc](wrangler.jsonc) 与 [docs/public/_headers](docs/public/_headers)），绑定域名 `ai-handbook.kapukapu.cn`。

- **GitHub Actions 自动校验与部署**（[.github/workflows/deploy.yml](.github/workflows/deploy.yml)）：
  - 每次推送到 `main` 或提交 PR 都会自动执行 `pnpm check`。
  - 在仓库 **Settings → Secrets and variables → Actions** 配置 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID` 后，推送到 `main` 会自动执行 `npx wrangler deploy` 发布更新。
- **Cloudflare Workers Builds / 本地手动部署**：
  ```bash
  pnpm build && npx wrangler deploy
  ```

## 全局批注与修订建议

站点通过同域 Worker（[worker/index.ts](worker/index.ts)）与 Cloudflare D1 提供全局批注功能：

- 读者可开启右下角「批注模式」划词提修改建议，或点击正文虚线辅助线查看与回复批注（称呼必填，邮箱选填且不公开返回）。
- 已采纳的建议会收起正文虚线，同时保留在页面「批注记录 → 已采纳修订」中展示贡献者。
- 维护者或 AI 可通过 [tools/annotations.mjs](tools/annotations.mjs) 批量拉取与处理建议（需在环境变量或 `.env.local` 配置 `ANNOTATIONS_ADMIN_TOKEN`）：
  ```bash
  pnpm annotations:pull
  pnpm annotations:resolve <id1,id2> --note "已采纳修改"
  ```

## 目录说明

```text
.
├── .github/workflows/deploy.yml   # 自动校验与 Cloudflare 部署工作流
├── ai-docs/glossary.md            # 自动生成的术语对照表
├── docs/                          # 手册正文、插图与 VitePress 主题
├── migrations/                    # Cloudflare D1 数据库结构迁移
├── tools/                         # 校验脚本与批注管理 CLI
├── worker/                        # Cloudflare Worker（/api/* 批注接口 + 静态资源）
├── AGENTS.md                      # 写作定位、语感与术语约定
├── package.json
└── wrangler.jsonc                 # Cloudflare Workers、Static Assets 与 D1 配置
```
