# 金龙鱼履约 Agent — Orange SaaS 设计规范

传统 B2B SaaS 布局 + **橙色品牌**主视觉。

## 品牌色

| Token | 值 | 用途 |
|-------|-----|------|
| `--color-brand` | `#ff4d00` | 主色：CTA、选中态、强调数字 |
| `--color-brand-dark` | `#e64500` | 深色文字、悬停 |
| `--color-brand-light` | `#fff4ef` | 浅橙底、Agent 建议区、选中行背景 |
| `--color-brand-muted` | `rgba(255,77,0,0.1)` | 徽章、标签底 |
| `--color-canvas-warm` | `#faf6f3` | 页面背景（暖灰橙） |
| `--color-cloud-canvas` | `#f0e8e2` | 边框、分割线 |

## 组件约定

- **顶栏**：白底 + 顶部 3px 品牌橙条 + 橙色 Logo 渐变
- **角色切换**：浅橙轨道 + 选中橙色实心 pill + 白字
- **Pipeline / 任务**：选中卡片橙色描边 + 浅橙底；步骤序号橙底
- **主按钮**：橙色实心、8px 圆角（`btn-primary`）
- **Agent 区**：浅橙底 + 左侧 3px 橙条；`AGENT` 标签橙底白字
- **输入框**：聚焦橙色描边 + 橙色光晕（`input-field`）

## 字体

- UI：Inter 400/500/600
- 数据：JetBrains Mono（订单号、SKU、数量）

详见 [`src/styles/tokens.css`](src/styles/tokens.css)、[`src/index.css`](src/index.css)。
