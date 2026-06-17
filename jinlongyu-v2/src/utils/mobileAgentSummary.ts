import type { MobileHomeKpis, RoleTaskItem, ShortagePO, WorkbenchRole } from '../types/shortage'
import {
  countLogisticsClosed,
  countProcurementSubmitted,
  countTodayShortageLines,
  daysRemaining,
  getShortageLines,
  getTasksForRole,
  isDeliveryToday,
  isFulfillmentDone,
  isSalesTrackedShortageLine,
} from './shortageAggregations'

export type { MobileHomeKpis }

function urgencyScore(requiredDate: string): number {
  const days = daysRemaining(requiredDate)
  return Math.max(0, 100 - days * 10)
}

function enrichTask(task: RoleTaskItem, orders: ShortagePO[]): RoleTaskItem {
  const line = orders
    .flatMap((po) => po.lines.map((l) => ({ ...l, po })))
    .find((l) => l.id === task.lineId)
  if (!line) return task

  const delivery = line.po.requiredDeliveryDate
  const days = daysRemaining(delivery)

  return {
    ...task,
    customerName: line.po.customerName,
    deliveryAddress: line.po.deliveryAddress,
    productName: line.productName,
    requiredDeliveryDate: delivery,
    gap: line.gap,
    unit: line.unit,
    urgencyScore: urgencyScore(delivery),
    sub: `交期 ${delivery.slice(5)}（${days} 天）· 缺 ${line.gap}${line.unit}`,
  }
}

export function getRoleTasksSorted(orders: ShortagePO[], role: WorkbenchRole): RoleTaskItem[] {
  return getTasksForRole(orders, role)
    .map((t) => enrichTask(t, orders))
    .sort((a, b) => {
      const dateA = a.requiredDeliveryDate ?? '9999-12-31'
      const dateB = b.requiredDeliveryDate ?? '9999-12-31'
      if (dateA !== dateB) return dateA.localeCompare(dateB)
      return (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0)
    })
}

function getTodayShortageLines(orders: ShortagePO[], role: WorkbenchRole) {
  const daily = getShortageLines(orders).filter((l) => isDeliveryToday(l.po.requiredDeliveryDate))
  if (role !== 'sales') return daily
  return daily.filter((l) => isSalesTrackedShortageLine(l))
}

export function getMobileHomeKpis(orders: ShortagePO[], role: WorkbenchRole): MobileHomeKpis {
  const daily = getTodayShortageLines(orders, role)
  return {
    shortageLineCount: countTodayShortageLines(orders, new Date(), role),
    procurementSubmittedCount: countProcurementSubmitted(orders, new Date(), role),
    logisticsClosedCount: countLogisticsClosed(orders, new Date(), role),
    totalGap: daily.reduce((s, l) => s + l.gap, 0),
  }
}

export function getRoleWelcomeLine(role: WorkbenchRole): string {
  switch (role) {
    case 'sales':
      return '下方为按酒店数据总览，点选酒店可查看待处理、延期与加急明细。'
    case 'procurement':
      return '点击品项进入处理页，各 PO 可分别选择加急/延期、供应商与配送方式。'
    case 'ops':
      return '点选品类查看待处理与已提交明细。'
  }
}

export function findTaskByUserText(
  tasks: RoleTaskItem[],
  text: string
): RoleTaskItem | null {
  const t = text.trim()
  if (!t) return null

  const indexMatch = t.match(/第\s*(\d+)\s*个/)
  if (indexMatch) {
    const idx = Number(indexMatch[1]) - 1
    if (idx >= 0 && idx < tasks.length) return tasks[idx]
  }

  const lower = t.toLowerCase()
  return (
    tasks.find((task) => {
      const title = task.title.toLowerCase()
      const customer = (task.customerName ?? '').toLowerCase()
      const product = (task.productName ?? '').toLowerCase()
      return (
        title.includes(lower) ||
        customer.includes(lower) ||
        product.includes(lower) ||
        lower.includes(title)
      )
    }) ?? null
  )
}

export const MOBILE_SUGGESTED_QUESTIONS: Record<WorkbenchRole, string[]> = {
  procurement: ['今日还有多少缺货？', '最紧急的是哪个品？', '打开数据大盘'],
  sales: ['有哪些客户延期了？', '今日缺货总量多少？'],
  ops: ['今日缺货汇总', '采购已提交多少？', '最紧急的是哪个品？'],
}

export const ROLE_LABEL: Record<WorkbenchRole, string> = {
  ops: '运营',
  sales: '销售',
  procurement: '采购',
}

export type MobileTaskListTab = 'pending' | 'done'

export function getMobileTaskListItems(
  orders: ShortagePO[],
  role: WorkbenchRole,
  tab: MobileTaskListTab,
  hotelFilter?: string | null,
  sortAsc = true
): RoleTaskItem[] {
  let items: RoleTaskItem[]
  if (tab === 'pending') {
    items = getRoleTasksSorted(orders, role)
  } else {
    items = getShortageLines(orders)
      .filter(
        (l) =>
          isDeliveryToday(l.po.requiredDeliveryDate) &&
          isFulfillmentDone(l) &&
          (role !== 'sales' || isSalesTrackedShortageLine(l))
      )
      .map((l) => ({
        id: l.id,
        lineId: l.id,
        poId: l.po.id,
        sku: l.sku,
        title: `${l.productName}`,
        sub: `${l.po.customerName} · 已闭环`,
        stage: 'fulfillment_done' as const,
      }))
      .map((t) => enrichTask(t, orders))
  }

  if (hotelFilter) {
    items = items.filter(
      (t) =>
        t.customerName === hotelFilter ||
        t.title.includes(hotelFilter) ||
        (t.deliveryAddress && t.deliveryAddress.includes(hotelFilter))
    )
  }

  return items.sort((a, b) => {
    const dateA = a.requiredDeliveryDate ?? '9999-12-31'
    const dateB = b.requiredDeliveryDate ?? '9999-12-31'
    return sortAsc ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA)
  })
}

export function getMobileTaskListHotels(orders: ShortagePO[], role: WorkbenchRole): string[] {
  const pending = getRoleTasksSorted(orders, role)
  const done = getMobileTaskListItems(orders, role, 'done')
  const names = new Set<string>()
  for (const t of [...pending, ...done]) {
    if (t.customerName) names.add(t.customerName)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}
