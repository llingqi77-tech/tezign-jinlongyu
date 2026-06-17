import type { MobileKpiKind, RoleTaskItem, ShortagePO, WorkbenchRole } from '../types/shortage'
import { OA_APPROVAL_STATUS_LABEL } from '../constants/shortageLabels'
import {
  getShortageLines,
  groupByHotel,
  getMostUrgentProcurementSkuGroups,
  formatMostUrgentProcurementReply,
  isDeliveryToday,
} from './shortageAggregations'
import { getMobileHomeKpis, getRoleTasksSorted } from './mobileAgentSummary'

export type MobileSalesQuickView = 'hotel_overview' | 'fulfillment'

export type MobileProcurementQuickView = 'delivery' | 'supplier' | 'oa' | 'fulfillment'

export type MobileQuickActionKind =
  | 'open_dashboard'
  | 'open_task_list'
  | 'open_kpi_detail'
  | 'procurement_sort'
  | 'sales_hotel_overview'
  | 'chat'

export interface MobileQuickActionItem {
  id: string
  label: string
  kind: MobileQuickActionKind
  message?: string
  kpiKind?: MobileKpiKind
  procurementSort?: 'delivery' | 'supplier' | 'oa'
}

const SALES_QUICK_ACTIONS: MobileQuickActionItem[] = []

const PROCUREMENT_QUICK_ACTIONS: MobileQuickActionItem[] = [
  { id: 'delivery', label: '缺货采购处理', kind: 'procurement_sort', procurementSort: 'delivery' },
  { id: 'oa', label: 'OA进度查询', kind: 'procurement_sort', procurementSort: 'oa' },
  { id: 'dashboard', label: '履约数据总览', kind: 'open_dashboard' },
]

/** 运营进入即展示履约数据面板，无需底部快捷 Tab */
const OPS_QUICK_ACTIONS: MobileQuickActionItem[] = []

export function getMobileQuickActions(role: WorkbenchRole): MobileQuickActionItem[] {
  switch (role) {
    case 'sales':
      return SALES_QUICK_ACTIONS
    case 'procurement':
      return PROCUREMENT_QUICK_ACTIONS
    case 'ops':
      return OPS_QUICK_ACTIONS
  }
}

function formatTaskLines(tasks: RoleTaskItem[], max = 3): string {
  if (tasks.length === 0) return ''
  const lines = tasks
    .slice(0, max)
    .map(
      (t, i) =>
        `${i + 1}. ${t.title}（交期 ${t.requiredDeliveryDate?.slice(5) ?? '—'}${t.gap != null && t.unit ? ` · 缺 ${t.gap}${t.unit}` : ''}）`
    )
  const rest = tasks.length - max
  return lines.join('\n') + (rest > 0 ? `\n还有 ${rest} 项未列出。` : '')
}

function todayShortageLines(orders: ShortagePO[]) {
  return getShortageLines(orders).filter((l) => isDeliveryToday(l.po.requiredDeliveryDate))
}

export function buildQuickActionReply(
  message: string,
  role: WorkbenchRole,
  orders: ShortagePO[]
): string | null {
  const tasks = getRoleTasksSorted(orders, role)
  const kpis = getMobileHomeKpis(orders, role)
  const daily = todayShortageLines(orders)

  if (message === '有哪些客户延期了？') {
    const groups = groupByHotel(orders)
    if (groups.length === 0) return '目前没有延期缺货通知。'
    return `共 ${groups.length} 个客户地址有延期缺货：\n${groups
      .slice(0, 5)
      .map((g, i) => `${i + 1}. ${g.hotelName} · ${g.deliveryAddress}`)
      .join('\n')}`
  }

  if (message === '今日缺货数据有多少？' || message === '今日缺货汇总') {
    return `今日缺货 ${kpis.shortageLineCount} 个品，缺口合计 ${kpis.totalGap}；采购已提交 ${kpis.procurementSubmittedCount} 个品。`
  }

  if (message === '最紧急的是哪个品？' || message === '采购侧哪些任务交期最紧急？') {
    if (role === 'procurement') {
      const urgentGroups = getMostUrgentProcurementSkuGroups(orders)
      return formatMostUrgentProcurementReply(urgentGroups)
    }
    if (tasks.length === 0) return '采购待办已清空。'
    return `最紧急的缺货处理：\n${formatTaskLines(tasks.slice(0, 3))}`
  }

  if (message === '有多少 OA 审批中？') {
    const oaLines = daily.filter((l) => l.oaApprovalStatus === 'pending')
    if (oaLines.length === 0) return '当前没有 OA 审批中的单据。'
    return `共 ${oaLines.length} 项 ${OA_APPROVAL_STATUS_LABEL.pending}。`
  }

  if (message === '采购已提交多少？') {
    return `今日采购已提交 ${kpis.procurementSubmittedCount} 个品。`
  }

  void role
  return null
}

export function isRoleQuickActionMessage(message: string, role: WorkbenchRole): boolean {
  return getMobileQuickActions(role).some((a) => a.kind === 'chat' && a.message === message)
}
