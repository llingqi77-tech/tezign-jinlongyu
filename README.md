# tezign-jinlongyu

该仓库用于承载「金龙鱼缺货履约 Agent」相关代码与交付内容。

## 仓库结构

- `jinlongyu-v2/`：主项目代码（前端移动端工作台）
- `.pnpm-store/`：本地依赖缓存（历史提交已包含，后续建议忽略）

## 快速开始

主项目位于 `jinlongyu-v2`，进入后安装并启动：

```bash
cd jinlongyu-v2
pnpm install
pnpm dev
```

默认访问地址：

- 本机：`http://localhost:5173`
- 局域网设备（手机调试）：`pnpm dev:mobile`

## GitHub Pages 在线预览

仓库地址：[https://llingqi77-tech.github.io/tezign-jinlongyu/](https://llingqi77-tech.github.io/tezign-jinlongyu/)

**注意：** Pages 部署的是 `jinlongyu-v2` 构建后的静态站点，不是根目录这份 README。

1. 在 GitHub 仓库 **Settings → Pages → Build and deployment** 中，将 Source 设为 **GitHub Actions**
2. 推送 `main` 分支后，`.github/workflows/deploy-pages.yml` 会自动构建并发布
3. 本地模拟 Pages 构建：`cd jinlongyu-v2 && pnpm build:pages && pnpm preview:pages`

## 说明

- 当前仓库根目录用于统一管理，业务代码与详细文档请查看 `jinlongyu-v2/README.md`
- 若你是首次克隆仓库且发现 `jinlongyu-v2` 内容为空，请执行：

```bash
git submodule update --init --recursive
```

