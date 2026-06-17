# 金龙鱼缺货履约 Agent（移动端工作台）

面向「金龙鱼缺货履约」场景的**移动端（手机）Web 演示**：以**当日缺货待转单**为数据底表，让 **运营 / 销售 / 采购** 三角色在对话式工作台中协同完成缺货履约。整体采用**橙色主题的轻量 SaaS** 视觉（暖色画布、白卡片、品牌橙 CTA / 选中态、Inter 字体），设计规范见 [`design.md`](design.md)。

> 当前版本为**纯移动端布局**：`App.tsx` 会强制启用 `platform-mobile`，`WorkbenchShell` 直接渲染 `MobileWorkbenchShell`。在桌面浏览器中请用开发者工具的移动设备模拟（视口 ≤ 768px）查看，或直接用手机 / `dev:mobile` 访问。

## 快速开始

仓库使用 **pnpm**（含 `pnpm-lock.yaml`），也兼容 npm。

```bash
pnpm install
pnpm dev
```

浏览器打开 `http://localhost:5173`，切换到移动设备视图查看。手机或同局域网设备访问可用：

```bash
pnpm dev:mobile   # vite --host，输出局域网地址
```

## 数据模型

最小单元是 `ShortagePOLine`：酒店 PO 中的一个 SKU 行，即「一条履约任务」。所有流程都是这条记录在改字段（履约方式、采购结果、OA 审批、签收状态等，派生出 `status`）。详见 [`src/types/shortage.ts`](src/types/shortage.ts) 与 [`src/store/shortageStore.ts`](src/store/shortageStore.ts)。

## 角色与界面

进入后先在**角色选择页**（`MobileRolePickScreen`）选择身份，再进入对话式工作台首页（`MobileAgentHome`）：

- **运营（ops）**：掌握全链路缺货与各环节进度
- **销售（sales）**：按**酒店**维度只读跟踪履约与签收
- **采购（procurement）**：按**品 / SKU** 维度寻源、填表、提交采购

首页包含 KPI 概览（`MobileHomeKpiStrip`）、任务列表（`MobileHomeTaskList`）、快捷操作与对话区；采购点开品项进入填表页（`MobileProcurementSkuPage`），销售可查看历史（`MobileSalesHistoryPage`）。

## 业务流程（以代码实现为准）

完整说明见 [`业务流程-代码版.md`](业务流程-代码版.md)，核心链路：

1. **邮件 Agent 解析 → 今日缺货待转单**（`loadTodayShortages`）。
2. **系统自动算路**（`applyBackendLogisticsRouting`）：
   - 大仓有库存 → `direct_ship`（直发），大仓缺货但有在途单 → `normal_replenishment`（正常补货）——这两类**直接进正常物流待签收，不进采购 / 销售**。
   - 既无库存又无在途单 → 保持 `pending`，**转采购人工寻源**。
3. **采购**按「品 / SKU」聚合处理（视野：今日 ~ +6 天），每个酒店 PO 行选 **加急 / 延期** 并填供应商 / 采购价 / 预计交期 / 配送方式，提交 `submitProcurementSkuBatch`。
4. **OA 加一审批**（mock）：通过后生成草稿号 → `confirmProcurementToErp` 写入金龙鱼采购系统（`PU-xxx`）→ 进入 `await_logistics`。
5. **销售**按「酒店」聚合只读跟踪（待处理 / 延期 / 加急），据采购确认的交期通知客户、推动签收。
6. **签收闭环**：`startSignoffMock` 定时模拟客户签收（`applySignoff`）→ `status=completed`。

## 技术栈

- **Vite 6** + **React 18** + **TypeScript**
- **Tailwind CSS 3**（配合 `src/styles/tokens.css`、`src/styles/mobile.css`）
- **Zustand**（全局状态 `shortageStore`，纯前端 mock 数据，无后端）

## 目录结构

```
src/
  App.tsx                      入口：强制移动端 + 打开工作台
  components/
    erp/                       易分销背景 + Agent 浮动入口（遗留组件，当前未挂载）
    workbench/
      WorkbenchModal/Shell     外层弹窗 + 移动壳层
      mobile/                  移动端各页面与组件（首页 / 采购填表 / 销售历史 / 各类 Sheet）
      shared/                  通用对话、进度条、流式文本等
  store/shortageStore.ts       核心状态机与所有业务动作
  types/shortage.ts            数据模型与类型
  utils/                       聚合、算路规则、对话、推荐、展示等纯函数
  mocks/                       缺货 / 通知 / 销售历史等 mock 数据
  hooks/useIsMobile.ts         移动端判定与 platform 类切换
```

## 构建

```bash
pnpm build     # tsc --noEmit && vite build
pnpm preview   # 本地预览构建产物
```

## 相关文档

- [`design.md`](design.md)：橙色 SaaS 设计规范（色板、组件约定、字体）
- [`业务流程-代码版.md`](业务流程-代码版.md)：以当前代码为准的销售 / 采购流程图
- [`业务流程.md`](业务流程.md)：PRD 理想视角的业务流程
- [`完美履约Agent_MVP_PRD.md`](完美履约Agent_MVP_PRD.md)：MVP 产品需求文档
- [`ROADMAP.md`](ROADMAP.md)：版本规划与待对齐事项
