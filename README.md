# 提问、验证与交付

一本写给真实工作场景的 AI 协作与工程实践手册，基于 [VitePress](https://vitepress.dev/) 构建。

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

## 部署

### GitHub Pages

仓库已内置 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)。推送到 `main` 分支后会自动运行校验、构建并部署：

1. 在 GitHub 仓库的 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
2. 工作流会自动读取 Pages 路径并注入 `DOCS_BASE`，支持项目子路径（`/<repo>/`）和自定义域名（`/`）。

### Cloudflare（Pages / Workers）

仓库根目录即为文档站项目根目录，同时支持以下两种 Cloudflare 部署方式：

- **Cloudflare Pages**（连接 GitHub 仓库）：
  - 构建命令：`pnpm build`
  - 构建输出目录：`docs/.vitepress/dist`
  - 根目录：`/`（留空即可）
- **Cloudflare Workers（Static Assets）**：
  - 仓库已提供 [wrangler.jsonc](wrangler.jsonc)，可直接接入 Cloudflare Workers Builds，或在本地构建后执行：
    ```bash
    pnpm build && npx wrangler deploy
    ```

[docs/public/_headers](docs/public/_headers) 已为静态资源配置了缓存策略，两种方式均可直接生效。

## 目录说明

```text
.
├── .github/workflows/deploy.yml   # GitHub Pages 自动校验与发布
├── ai-docs/glossary.md            # 自动生成的术语对照表
├── docs/                          # 手册正文、插图与 VitePress 主题
├── tools/                         # 术语、文风、时效、链接与公开性校验脚本
├── AGENTS.md                      # 写作定位、语感与术语约定
├── package.json
└── wrangler.jsonc                 # Cloudflare Workers 静态资源配置
```
