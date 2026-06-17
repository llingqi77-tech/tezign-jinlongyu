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

## 说明

- 当前仓库根目录用于统一管理，业务代码与详细文档请查看 `jinlongyu-v2/README.md`
- 若你是首次克隆仓库且发现 `jinlongyu-v2` 内容为空，请执行：

```bash
git submodule update --init --recursive
```

