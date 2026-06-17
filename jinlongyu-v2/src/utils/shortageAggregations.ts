import type {
  FulfillmentDoneSummary,
  FulfillmentMethod,
  FulfillmentKpis,
  KpiClosedPoGroup,
  KpiSkuGroup,
  KpiSkuPoRow,
  OpsCreateSummary,
  OaApprovalStatus,
  ProcurementSkuGroup,
  RoleTaskItem,
  SalesHotelGroup,
  SalesSkuUpdateBatch,
  SalesSkuUpdateHotelGroup,
  ShortagePO,
  ShortagePOLine,
  SupplierProcurementBatch,
  WorkbenchRole,
  FulfillmentOverviewStatusKind,
} from '../types/shortage'
import { FULFILLMENT_METHOD_LABEL, OA_APPROVAL_STATUS_LABEL } from '../constants/shortageLabels'
import {
  isLogisticsFulfillment,
  lineNeedsProcurementAction,
  resolveBackendLogisticsMethod,
} from './fulfillmentMethodRules'
import { getPrimarySupplier } from './supplierRecommendations'

export function getShortageLines(orders: ShortagePO[]): Array<ShortagePOLine & { po: ShortagePO }> {
  return orders.flatMap((po) =>
    po.lines.filter((l) => l.isShortage).map((line) => ({ ...line, po }))
  )
}

export function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addCalendarDays(base: Date, days: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  d.setDate(d.getDate() + days)
  return localDateKey(d)
}

export function daysRemaining(requiredDate: string, from = new Date()): number {
  const [y, m, day] = requiredDate.slice(0, 10).split('-').map(Number)
  const end = new Date(y, m - 1, day)
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export function toDateKey(date: Date | string): string {
  if (typeof date === 'string') return date.slice(0, 10)
  return localDateKey(date)
}

export function isDeliveryToday(requiredDate: string, ref = new Date()): boolean {
  return toDateKey(requiredDate) === toDateKey(ref)
}

export function getWeekRange(ref = new Date()): { start: string; end: string } {
  const anchor = new Date(ref)
  anchor.setHours(0, 0, 0, 0)
  const day = anchor.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const weekStart = new Date(anchor)
  weekStart.setDate(anchor.getDate() + mondayOffset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  return { start: toDateKey(weekStart), end: toDateKey(weekEnd) }
}

export function isDeliveryThisWeek(requiredDate: string, ref = new Date()): boolean {
  const key = toDateKey(requiredDate)
  const { start, end } = getWeekRange(ref)
  return key >= start && key <= end
}

export function formatWeekRangeLabel(ref = new Date()): string {
  const { start, end } = getWeekRange(ref)
  const fmt = (iso: string) => {
    const [, m, d] = iso.split('-')
    return `${Number(m)}/${Number(d)}`
  }
  return `${fmt(start)}–${fmt(end)}`
}

type ShortageLineWithPo = ShortagePOLine & { po: ShortagePO }

function filterDailyLines(lines: ShortageLineWithPo[], ref = new Date()): ShortageLineWithPo[] {
  return lines.filter((l) => isDeliveryToday(l.po.requiredDeliveryDate, ref))
}

/** 采购任务清单：今日起 7 日内交期的 PO（含演示错开至 +6 日） */
export function isProcurementTaskHorizon(requiredDate: string, ref = new Date()): boolean {
  const key = toDateKey(requiredDate)
  const start = toDateKey(ref)
  const end = toDateKey(addCalendarDays(ref, 6))
  return key >= start && key <= end
}

function filterProcurementTaskLines(lines: ShortageLineWithPo[], ref = new Date()): ShortageLineWithPo[] {
  return lines.filter((l) => isProcurementTaskHorizon(l.po.requiredDeliveryDate, ref))
}

function filterWeeklyLines(lines: ShortageLineWithPo[], ref = new Date()): ShortageLineWithPo[] {
  return lines.filter((l) => isDeliveryThisWeek(l.po.requiredDeliveryDate, ref))
}

export function uniqueShortageSkus(lines: ShortagePOLine[]): string[] {
  return [...new Set(lines.filter((l) => l.isShortage).map((l) => l.sku))]
}

export function isProcurementDone(line: ShortagePOLine): boolean {
  if (line.procurementOutcome === 'not_satisfied') return true
  return line.procurementOutcome === 'satisfied' && line.procurementConfirmed
}

export function isFulfillmentDone(line: ShortagePOLine): boolean {
  return line.signoffStatus === 'signed' || line.status === 'completed'
}

export function needsLogistics(line: ShortagePOLine): boolean {
  if (!line.isShortage) return false
  if (isLogisticsFulfillment(line.fulfillmentMethod)) return true
  if (line.procurementOutcome === 'satisfied' && line.procurementConfirmed) return true
  if (line.procurementOutcome === 'not_satisfied' || line.fulfillmentMethod === 'defer') return true
  return false
}

export function isSalesDeferLine(line: ShortagePOLine): boolean {
  return (
    line.isShortage &&
    (line.procurementOutcome === 'not_satisfied' || line.fulfillmentMethod === 'defer')
  )
}

/** 销售可见：采购加急通道（排除直发/正常补货等自动算路） */
export function isSalesUrgentLine(line: ShortagePOLine): boolean {
  if (!line.isShortage || isLogisticsFulfillment(line.fulfillmentMethod)) return false
  return (
    line.procurementMode === 'urgent' ||
    (line.procurementOutcome === 'satisfied' && line.fulfillmentMethod === 'satisfied')
  )
}

/** 销售可见：采购尚未确认（待采购处理） */
export function isSalesPendingProcurementLine(line: ShortagePOLine): boolean {
  if (!line.isShortage || isLogisticsFulfillment(line.fulfillmentMethod)) return false
  if (isSalesDeferLine(line) || isSalesUrgentLine(line)) return false
  return line.fulfillmentMethod === 'pending' || line.status === 'await_procurement'
}

/** 销售 KPI / 通知：加急 + 延期 + 待采购处理 */
export function isSalesTrackedShortageLine(line: ShortagePOLine): boolean {
  return isSalesDeferLine(line) || isSalesUrgentLine(line) || isSalesPendingProcurementLine(line)
}

function filterLinesForRole(
  lines: ShortageLineWithPo[],
  role?: WorkbenchRole
): ShortageLineWithPo[] {
  if (role !== 'sales') return lines
  return lines.filter((l) => isSalesTrackedShortageLine(l))
}

export function recomputeLineStatus(line: ShortagePOLine): ShortagePOLine {
  if (line.status === 'cancelled') return line
  if (isFulfillmentDone(line)) return { ...line, status: 'completed' }
  if (!line.isShortage) return { ...line, status: 'new' }

  if (lineNeedsProcurementAction(line)) {
    if (line.procurementOutcome === 'satisfied' && line.oaApprovalStatus === 'approved') {
      if (line.procurementDraftNo && !line.procurementConfirmed) {
        return { ...line, status: 'ready_for_po' }
      }
      return { ...line, status: 'await_logistics' }
    }
    if (line.procurementOutcome === 'satisfied' && line.oaApprovalStatus === 'pending') {
      return { ...line, status: 'await_procurement' }
    }
    return { ...line, status: 'await_procurement' }
  }

  if (needsLogistics(line) && line.signoffStatus !== 'signed') {
    return { ...line, status: 'await_logistics' }
  }

  return { ...line, status: 'new' }
}

export function getFulfillmentKpis(orders: ShortagePO[]): FulfillmentKpis {
  const lines = getShortageLines(orders)
  const skus = uniqueShortageSkus(lines.map((l) => l))
  return {
    actualQty: lines.reduce((s, l) => s + l.actualFulfillQty, 0),
    totalGap: lines.reduce((s, l) => s + l.gap, 0),
    signedSkuCount: skus.filter((sku) =>
      lines.filter((l) => l.sku === sku).every(isFulfillmentDone)
    ).length,
    totalSkuCount: skus.length,
  }
}

export function hotelKey(customerName: string, deliveryAddress: string): string {
  return `${customerName}::${deliveryAddress}`
}

export function groupBySku(orders: ShortagePO[], refDate = new Date()): ProcurementSkuGroup[] {
  const map = new Map<string, ProcurementSkuGroup>()
  const taskLines = filterProcurementTaskLines(getShortageLines(orders), refDate)

  for (const { po, ...line } of taskLines) {
    if (isLogisticsFulfillment(line.fulfillmentMethod)) continue
    if (line.procurementOutcome === 'not_satisfied') continue
    if (isProcurementDone(line)) continue
    if (!lineNeedsProcurementAction(line)) continue

    let group = map.get(line.sku)
    if (!group) {
      group = {
        sku: line.sku,
        productName: line.productName,
        spec: line.spec,
        unit: line.unit,
        unitPrice: line.unitPrice,
        totalGap: 0,
        hotelCount: 0,
        lineCount: 0,
        earliestRequiredDate: po.requiredDeliveryDate,
        latestRequiredDate: po.requiredDeliveryDate,
        procurementStatus: 'pending',
        hotelRows: [],
      }
      map.set(line.sku, group)
    }

    const dr = daysRemaining(po.requiredDeliveryDate)
    group.totalGap += line.gap
    group.lineCount += 1
    if (po.requiredDeliveryDate < group.earliestRequiredDate) {
      group.earliestRequiredDate = po.requiredDeliveryDate
    }
    if (po.requiredDeliveryDate > group.latestRequiredDate) {
      group.latestRequiredDate = po.requiredDeliveryDate
    }

    group.hotelRows.push({
      lineId: line.id,
      poId: po.id,
      hotelName: po.customerName,
      deliveryAddress: po.deliveryAddress,
      gap: line.gap,
      unit: line.unit,
      unitPrice: line.unitPrice,
      requiredDeliveryDate: po.requiredDeliveryDate,
      daysRemaining: dr,
      fulfillmentMethod: line.fulfillmentMethod,
      supplierName: line.supplierName,
      eta: line.eta,
      amount: line.amount,
      status: line.status,
      procurementConfirmed: line.procurementConfirmed,
      procurementOutcome: line.procurementOutcome,
    })
  }

  const groups = Array.from(map.values()).filter((g) => g.hotelRows.length > 0)
  for (const g of groups) {
    g.hotelCount = new Set(g.hotelRows.map((r) => hotelKey(r.hotelName, r.deliveryAddress))).size
    g.procurementStatus = g.hotelRows.every((r) => {
      const l = taskLines.find((x) => x.id === r.lineId)
      return l ? isProcurementDone(l) : false
    })
      ? 'done'
      : 'pending'
    g.hotelRows.sort(
      (a, b) =>
        a.requiredDeliveryDate.localeCompare(b.requiredDeliveryDate) ||
        a.lineId.localeCompare(b.lineId)
    )
  }

  return groups.sort((a, b) => a.earliestRequiredDate.localeCompare(b.earliestRequiredDate))
}

export type FulfillmentOverviewSkuGroup = ProcurementSkuGroup & {
  statusKind: FulfillmentOverviewStatusKind
  statusLabel: string
  pendingPoCount: number
  processedPoCount: number
}

/** 任务清单（按交期）：尚未提交采购方案，或 OA 已驳回待改 */
export function isSkuAwaitingProcurementForm(line: ShortagePOLine): boolean {
  if (line.procurementOutcome === 'pending' && line.fulfillmentMethod === 'pending') return true
  if (line.oaApprovalStatus === 'rejected') return true
  return false
}

export function isProcurementSkuAwaitingForm(
  group: ProcurementSkuGroup,
  orders: ShortagePO[],
  refDate = new Date()
): boolean {
  const skuLines = filterProcurementTaskLines(getShortageLines(orders), refDate).filter(
    (l) => l.sku === group.sku
  )
  return skuLines.some(isSkuAwaitingProcurementForm)
}

/** 任务清单卡片：仅统计待填写 / OA 驳回行的最早交期 */
export function getSkuEarliestAwaitingFormDate(
  group: ProcurementSkuGroup,
  orders: ShortagePO[],
  refDate = new Date()
): string {
  const dates = filterProcurementTaskLines(getShortageLines(orders), refDate)
    .filter((l) => l.sku === group.sku && isSkuAwaitingProcurementForm(l))
    .map((l) => l.po.requiredDeliveryDate)
  if (dates.length === 0) return group.earliestRequiredDate
  return dates.reduce((min, d) => (d < min ? d : min))
}

export function resolveSkuOverviewStatus(
  lines: ShortagePOLine[]
): { kind: FulfillmentOverviewStatusKind; label: string } {
  if (lines.length === 0) return { kind: 'pending', label: '待处理' }
  if (lines.some((l) => l.procurementOutcome === 'pending' && l.fulfillmentMethod === 'pending')) {
    return { kind: 'pending', label: '待处理' }
  }
  if (lines.some((l) => l.oaApprovalStatus === 'rejected')) return { kind: 'oa_rejected', label: '已驳回' }
  if (lines.some((l) => l.oaApprovalStatus === 'pending')) return { kind: 'oa_pending', label: 'OA审批中' }
  if (lines.some((l) => l.procurementOutcome === 'not_satisfied')) return { kind: 'defer', label: '已延期' }
  return { kind: 'fulfilling', label: '履约中' }
}

export function isProcurementLineSubmitted(line: ShortagePOLine): boolean {
  return line.procurementOutcome === 'satisfied' || line.procurementOutcome === 'not_satisfied'
}

export function isProcurementLineOaSubmitted(line: ShortagePOLine): boolean {
  return isProcurementLineSubmitted(line) && line.oaApprovalStatus !== 'none'
}

export function resolveSkuHandlingLabel(lines: ShortagePOLine[]): '加急' | '延期' {
  const submitted = lines.filter(isProcurementLineSubmitted)
  if (submitted.some((l) => l.procurementOutcome === 'not_satisfied')) return '延期'
  return '加急'
}

/** 仅针对已提交 OA 的 PO 行 */
export function resolveSkuOaProgressLabel(lines: ShortagePOLine[]): string {
  const oaLines = lines.filter((l) => l.oaApprovalStatus !== 'none')
  if (oaLines.length === 0) return ''
  if (oaLines.some((l) => l.oaApprovalStatus === 'rejected')) return '已驳回'
  if (oaLines.some((l) => l.oaApprovalStatus === 'pending')) return '审批中'
  return '已通过'
}

/** OA 进度查询：仅已提交采购方案的缺货 SKU */
export function groupBySkuOaProgress(orders: ShortagePO[], refDate = new Date()): ProcurementSkuGroup[] {
  const map = new Map<string, ProcurementSkuGroup>()
  const taskLines = filterProcurementTaskLines(getShortageLines(orders), refDate)

  for (const { po, ...line } of taskLines) {
    if (isLogisticsFulfillment(line.fulfillmentMethod)) continue
    if (!isProcurementLineOaSubmitted(line)) continue

    let group = map.get(line.sku)
    if (!group) {
      group = {
        sku: line.sku,
        productName: line.productName,
        spec: line.spec,
        unit: line.unit,
        unitPrice: line.unitPrice,
        totalGap: 0,
        hotelCount: 0,
        lineCount: 0,
        earliestRequiredDate: po.requiredDeliveryDate,
        latestRequiredDate: po.requiredDeliveryDate,
        procurementStatus: 'pending',
        hotelRows: [],
      }
      map.set(line.sku, group)
    }

    const dr = daysRemaining(po.requiredDeliveryDate)
    group.totalGap += line.gap
    group.lineCount += 1
    if (po.requiredDeliveryDate < group.earliestRequiredDate) {
      group.earliestRequiredDate = po.requiredDeliveryDate
    }
    if (po.requiredDeliveryDate > group.latestRequiredDate) {
      group.latestRequiredDate = po.requiredDeliveryDate
    }

    group.hotelRows.push({
      lineId: line.id,
      poId: po.id,
      hotelName: po.customerName,
      deliveryAddress: po.deliveryAddress,
      gap: line.gap,
      unit: line.unit,
      unitPrice: line.unitPrice,
      requiredDeliveryDate: po.requiredDeliveryDate,
      daysRemaining: dr,
      fulfillmentMethod: line.fulfillmentMethod,
      supplierName: line.supplierName,
      eta: line.eta,
      amount: line.amount,
      status: line.status,
      procurementConfirmed: line.procurementConfirmed,
      procurementOutcome: line.procurementOutcome,
    })
  }

  const groups = Array.from(map.values()).filter((g) => g.hotelRows.length > 0)
  for (const g of groups) {
    g.hotelCount = new Set(g.hotelRows.map((r) => hotelKey(r.hotelName, r.deliveryAddress))).size
    g.hotelRows.sort(
      (a, b) =>
        a.requiredDeliveryDate.localeCompare(b.requiredDeliveryDate) ||
        a.lineId.localeCompare(b.lineId)
    )
  }

  return groups.sort((a, b) => a.earliestRequiredDate.localeCompare(b.earliestRequiredDate))
}

export function getOaProgressProcurementGroups(
  orders: ShortagePO[],
  refDate = new Date()
): ProcurementSkuGroup[] {
  return groupBySkuOaProgress(orders, refDate)
}

/** 缺货品履约数据：近 3 日交期内的全部缺货 SKU（含已提交） */
export function groupBySkuFulfillmentOverview(
  orders: ShortagePO[],
  refDate = new Date()
): FulfillmentOverviewSkuGroup[] {
  const map = new Map<string, FulfillmentOverviewSkuGroup>()
  const taskLines = filterProcurementTaskLines(getShortageLines(orders), refDate)

  for (const { po, ...line } of taskLines) {
    if (isLogisticsFulfillment(line.fulfillmentMethod)) continue

    let group = map.get(line.sku)
    if (!group) {
      group = {
        sku: line.sku,
        productName: line.productName,
        spec: line.spec,
        unit: line.unit,
        unitPrice: line.unitPrice,
        totalGap: 0,
        hotelCount: 0,
        lineCount: 0,
        earliestRequiredDate: po.requiredDeliveryDate,
        latestRequiredDate: po.requiredDeliveryDate,
        procurementStatus: 'pending',
        hotelRows: [],
        statusKind: 'pending',
        statusLabel: '待处理',
        pendingPoCount: 0,
        processedPoCount: 0,
      }
      map.set(line.sku, group)
    }

    const dr = daysRemaining(po.requiredDeliveryDate)
    group.totalGap += line.gap
    group.lineCount += 1
    if (po.requiredDeliveryDate < group.earliestRequiredDate) {
      group.earliestRequiredDate = po.requiredDeliveryDate
    }
    if (po.requiredDeliveryDate > group.latestRequiredDate) {
      group.latestRequiredDate = po.requiredDeliveryDate
    }

    group.hotelRows.push({
      lineId: line.id,
      poId: po.id,
      hotelName: po.customerName,
      deliveryAddress: po.deliveryAddress,
      gap: line.gap,
      unit: line.unit,
      unitPrice: line.unitPrice,
      requiredDeliveryDate: po.requiredDeliveryDate,
      daysRemaining: dr,
      fulfillmentMethod: line.fulfillmentMethod,
      supplierName: line.supplierName,
      eta: line.eta,
      amount: line.amount,
      status: line.status,
      procurementConfirmed: line.procurementConfirmed,
      procurementOutcome: line.procurementOutcome,
    })
  }

  const groups = Array.from(map.values()).filter((g) => g.hotelRows.length > 0)
  for (const g of groups) {
    const skuLines = taskLines.filter((l) => l.sku === g.sku)
    const status = resolveSkuOverviewStatus(skuLines)
    g.statusKind = status.kind
    g.statusLabel = status.label
    g.pendingPoCount = skuLines.filter(
      (l) => l.procurementOutcome === 'pending' && l.fulfillmentMethod === 'pending'
    ).length
    g.processedPoCount = g.lineCount - g.pendingPoCount
    g.hotelCount = new Set(g.hotelRows.map((r) => hotelKey(r.hotelName, r.deliveryAddress))).size
    g.procurementStatus = g.pendingPoCount === 0 ? 'done' : 'pending'
    g.hotelRows.sort(
      (a, b) =>
        a.requiredDeliveryDate.localeCompare(b.requiredDeliveryDate) ||
        a.lineId.localeCompare(b.lineId)
    )
  }

  return groups.sort((a, b) => a.earliestRequiredDate.localeCompare(b.earliestRequiredDate))
}

export function groupByHotel(orders: ShortagePO[], refDate = new Date()): SalesHotelGroup[] {
  const map = new Map<string, SalesHotelGroup>()

  for (const po of orders) {
    if (!isDeliveryToday(po.requiredDeliveryDate, refDate)) continue
    for (const line of po.lines.filter(isSalesTrackedShortageLine)) {
      const key = hotelKey(po.customerName, po.deliveryAddress)
      let group = map.get(key)
      if (!group) {
        group = {
          hotelKey: key,
          hotelName: po.customerName,
          deliveryAddress: po.deliveryAddress,
          shortageLineCount: 0,
          nearestDeliveryDate: po.requiredDeliveryDate,
          poIds: [],
          lines: [],
        }
        map.set(key, group)
      }

      if (po.requiredDeliveryDate < group.nearestDeliveryDate) {
        group.nearestDeliveryDate = po.requiredDeliveryDate
      }
      if (!group.poIds.includes(po.id)) group.poIds.push(po.id)

      group.shortageLineCount += 1
      group.lines.push({
        lineId: line.id,
        poId: po.id,
        sku: line.sku,
        productName: line.productName,
        spec: line.spec,
        gap: line.gap,
        unit: line.unit,
        quantity: line.quantity,
        requiredDeliveryDate: po.requiredDeliveryDate,
        fulfillmentMethod: line.fulfillmentMethod,
        eta: line.eta,
        status: line.status,
        procurementOutcome: line.procurementOutcome,
      })
    }
  }

  const groups = Array.from(map.values())
  for (const g of groups) {
    g.lines.sort((a, b) => a.requiredDeliveryDate.localeCompare(b.requiredDeliveryDate))
  }
  return groups.sort((a, b) => a.nearestDeliveryDate.localeCompare(b.nearestDeliveryDate))
}

function salesNotifiedBatchKey(line: ShortagePOLine): string {
  const at = line.salesProcurementNotifiedAt?.trim()
  return at ? `${line.sku}::${at}` : `${line.sku}::legacy`
}

function salesNotifiedSortKey(line: ShortagePOLine): string {
  return line.salesProcurementNotifiedAt?.trim() || '1970-01-01T00:00:00.000Z'
}

/** 销售首页：采购已更新（加急/延期）的通知，按品项 + 推送批次聚合 */
export function groupSalesProcurementUpdates(
  orders: ShortagePO[],
  refDate = new Date()
): SalesSkuUpdateBatch[] {
  const batchMap = new Map<string, SalesSkuUpdateBatch>()

  for (const po of orders) {
    if (!isDeliveryToday(po.requiredDeliveryDate, refDate)) continue
    for (const line of po.lines) {
      if (!isSalesDeferLine(line) && !isSalesUrgentLine(line)) continue

      const batchKey = salesNotifiedBatchKey(line)
      let batch = batchMap.get(batchKey)
      if (!batch) {
        batch = {
          batchKey,
          sku: line.sku,
          productName: line.productName,
          spec: line.spec,
          notifiedAt: salesNotifiedSortKey(line),
          hotelCount: 0,
          lineCount: 0,
          hotels: [],
        }
        batchMap.set(batchKey, batch)
      }

      if (salesNotifiedSortKey(line) > batch.notifiedAt) {
        batch.notifiedAt = salesNotifiedSortKey(line)
      }

      batch.lineCount += 1
      batch.hotels.push({
        lineId: line.id,
        poId: po.id,
        hotelName: po.customerName,
        deliveryAddress: po.deliveryAddress,
        gap: line.gap,
        unit: line.unit,
        requiredDeliveryDate: po.requiredDeliveryDate,
        fulfillmentMethod: line.fulfillmentMethod,
        procurementOutcome: line.procurementOutcome,
        eta: line.eta,
      })
    }
  }

  const batches = Array.from(batchMap.values())
  for (const batch of batches) {
    batch.hotelCount = new Set(
      batch.hotels.map((h) => hotelKey(h.hotelName, h.deliveryAddress))
    ).size
    batch.hotels.sort((a, b) => a.requiredDeliveryDate.localeCompare(b.requiredDeliveryDate))
  }

  return batches.sort((a, b) => b.notifiedAt.localeCompare(a.notifiedAt))
}

/** 一次采购更新通知内按酒店地址分组（轮播每页一家酒店） */
export function groupSalesUpdateBatchByHotel(batch: SalesSkuUpdateBatch): SalesSkuUpdateHotelGroup[] {
  const map = new Map<string, SalesSkuUpdateHotelGroup>()
  for (const row of batch.hotels) {
    const key = hotelKey(row.hotelName, row.deliveryAddress)
    let group = map.get(key)
    if (!group) {
      group = { hotelKey: key, hotelName: row.hotelName, deliveryAddress: row.deliveryAddress, rows: [] }
      map.set(key, group)
    }
    group.rows.push(row)
  }
  const groups = Array.from(map.values())
  for (const g of groups) {
    g.rows.sort((a, b) => a.requiredDeliveryDate.localeCompare(b.requiredDeliveryDate))
  }
  return groups.sort((a, b) =>
    (a.rows[0]?.requiredDeliveryDate ?? '').localeCompare(b.rows[0]?.requiredDeliveryDate ?? '')
  )
}

export function getProcurementTasks(orders: ShortagePO[], refDate = new Date()): RoleTaskItem[] {
  const lines = filterDailyLines(getShortageLines(orders), refDate).filter(lineNeedsProcurementAction)

  return lines
    .map((l) => ({
      id: l.id,
      lineId: l.id,
      poId: l.po.id,
      sku: l.sku,
      title: `${l.productName}`,
      sub: `${l.po.customerName} · 缺 ${l.gap}${l.unit} · 交期 ${l.po.requiredDeliveryDate.slice(5)}`,
      stage: 'procurement' as const,
      customerName: l.po.customerName,
      deliveryAddress: l.po.deliveryAddress,
      productName: l.productName,
      requiredDeliveryDate: l.po.requiredDeliveryDate,
      gap: l.gap,
      unit: l.unit,
    }))
    .sort((a, b) => (a.requiredDeliveryDate ?? '').localeCompare(b.requiredDeliveryDate ?? ''))
}

function salesLineChannelLabel(line: {
  procurementOutcome: ShortagePOLine['procurementOutcome']
  fulfillmentMethod: ShortagePOLine['fulfillmentMethod']
}): string {
  if (line.procurementOutcome === 'not_satisfied' || line.fulfillmentMethod === 'defer') {
    return '延期'
  }
  return '加急'
}

export function getSalesDeferNotifications(orders: ShortagePO[]): RoleTaskItem[] {
  return groupByHotel(orders).flatMap((g) =>
    g.lines.map((line) => ({
      id: line.lineId,
      lineId: line.lineId,
      poId: line.poId,
      sku: line.sku,
      title: `${g.hotelName}`,
      sub: `${salesLineChannelLabel(line)} · ${line.productName} · 缺 ${line.gap}${line.unit}${line.eta ? ` · 预计 ${line.eta.slice(5)}` : ''}`,
      stage: 'sales_defer' as const,
      customerName: g.hotelName,
      deliveryAddress: g.deliveryAddress,
      productName: line.productName,
      requiredDeliveryDate: line.requiredDeliveryDate,
      gap: line.gap,
      unit: line.unit,
    }))
  )
}

export function getTasksForRole(orders: ShortagePO[], role: WorkbenchRole): RoleTaskItem[] {
  if (role === 'ops') {
    return filterDailyLines(getShortageLines(orders))
      .filter((l) => !isFulfillmentDone(l))
      .map((l) => ({
        id: l.id,
        lineId: l.id,
        poId: l.po.id,
        sku: l.sku,
        title: `${l.po.customerName} · ${l.productName}`,
        sub: `缺 ${l.gap}${l.unit} · ${l.status}`,
        stage: 'ops_create' as const,
      }))
  }
  if (role === 'sales') return getSalesDeferNotifications(orders)
  return getProcurementTasks(orders)
}

export function getTasksForFlowKind(orders: ShortagePO[], _kind: 'procurement'): RoleTaskItem[] {
  return getProcurementTasks(orders)
}

export function applyBackendLogisticsRouting(orders: ShortagePO[]): ShortagePO[] {
  return orders.map((po) => ({
    ...po,
    lines: po.lines.map((line) => {
      if (!line.isShortage) return recomputeLineStatus(line)
      const auto = resolveBackendLogisticsMethod(line, po)
      if (!auto) return recomputeLineStatus(line)
      return recomputeLineStatus({
        ...line,
        fulfillmentMethod: auto,
        salesNote: '',
        supplierName: '',
        selectedSupplierId: '',
        amount: 0,
        procurementDraftNo: '',
        procurementConfirmed: false,
        recommendedSuppliers: [],
        salesOutboundType: 'order_direct',
        salesOutboundNo: line.salesOutboundNo || `SO-D-AUTO-${line.id.slice(-4)}`,
        procurementOutcome: 'pending',
      })
    }),
  }))
}

export function ensureLineSuppliers(line: ShortagePOLine): ShortagePOLine {
  if (line.recommendedSuppliers.length > 0) return line
  if (isLogisticsFulfillment(line.fulfillmentMethod)) return line
  const primary = getPrimarySupplier(line.sku)
  return { ...line, recommendedSuppliers: [primary] }
}

const DONE_METHOD_KEYS: FulfillmentMethod[] = [
  'direct_ship',
  'normal_replenishment',
  'defer',
  'satisfied',
]

export function getOpsCreateSummary(orders: ShortagePO[], refDate = new Date()): OpsCreateSummary {
  const allLines = getShortageLines(orders)
  const dailyLines = filterDailyLines(allLines, refDate)
  const dailyPoIds = new Set(dailyLines.map((l) => l.po.id))

  return {
    poSynced: orders.filter((po) => po.lines.some((l) => l.isShortage)).length,
    poParsed: dailyPoIds.size,
    shortageLineCount: dailyLines.length,
    skuCount: uniqueShortageSkus(dailyLines).length,
    hotelCount: new Set(dailyLines.map((l) => hotelKey(l.po.customerName, l.po.deliveryAddress))).size,
    totalGapQty: dailyLines.reduce((s, l) => s + l.gap, 0),
  }
}

export function getFulfillmentDoneSummary(
  orders: ShortagePO[],
  refDate = new Date()
): FulfillmentDoneSummary {
  const allLines = getShortageLines(orders)
  const weeklyLines = filterWeeklyLines(allLines, refDate)
  const completed = weeklyLines.filter(isFulfillmentDone)
  const counts = new Map<FulfillmentMethod, number>()
  for (const key of DONE_METHOD_KEYS) counts.set(key, 0)
  for (const line of completed) {
    const m = line.fulfillmentMethod
    if (DONE_METHOD_KEYS.includes(m)) counts.set(m, (counts.get(m) ?? 0) + 1)
  }
  const total = completed.length
  const methodMix = DONE_METHOD_KEYS.map((method) => ({
    method,
    label: FULFILLMENT_METHOD_LABEL[method],
    count: counts.get(method) ?? 0,
    percent: total > 0 ? Math.round(((counts.get(method) ?? 0) / total) * 100) : 0,
  }))

  return {
    hotelCount: new Set(completed.map((l) => hotelKey(l.po.customerName, l.po.deliveryAddress))).size,
    orderCount: new Set(completed.map((l) => l.po.id)).size,
    completedLineCount: completed.length,
    methodMix,
  }
}

export function isProcurementSubmittedLine(line: ShortagePOLine): boolean {
  return (
    line.procurementOutcome === 'satisfied' &&
    (line.oaApprovalStatus === 'pending' ||
      line.oaApprovalStatus === 'approved' ||
      line.procurementConfirmed)
  )
}

function toKpiSkuPoRow(line: ShortagePOLine, po: ShortagePO): KpiSkuPoRow {
  return {
    lineId: line.id,
    poId: po.id,
    hotelName: po.customerName,
    deliveryAddress: po.deliveryAddress,
    gap: line.gap,
    unit: line.unit,
    requiredDeliveryDate: po.requiredDeliveryDate,
    status: line.status,
    procurementOutcome: line.procurementOutcome,
    fulfillmentMethod: line.fulfillmentMethod,
    supplierName: line.supplierName,
    eta: line.eta,
    oaApprovalStatus: line.oaApprovalStatus,
  }
}

function buildKpiSkuGroups(
  lines: Array<ShortagePOLine & { po: ShortagePO }>
): KpiSkuGroup[] {
  const map = new Map<string, KpiSkuGroup>()

  for (const { po, ...line } of lines) {
    let group = map.get(line.sku)
    if (!group) {
      group = {
        sku: line.sku,
        productName: line.productName,
        spec: line.spec,
        unit: line.unit,
        lineCount: 0,
        totalGap: 0,
        poRows: [],
      }
      map.set(line.sku, group)
    }
    group.lineCount += 1
    group.totalGap += line.gap
    group.poRows.push(toKpiSkuPoRow(line, po))
  }

  for (const group of map.values()) {
    group.poRows.sort((a, b) => a.requiredDeliveryDate.localeCompare(b.requiredDeliveryDate))
    const oaRow = group.poRows.find((r) => r.oaApprovalStatus !== 'none')
    if (oaRow) group.oaApprovalStatus = oaRow.oaApprovalStatus
  }

  return Array.from(map.values()).sort((a, b) =>
    a.productName.localeCompare(b.productName, 'zh-CN')
  )
}

export function getTodayShortageDetailGroups(
  orders: ShortagePO[],
  refDate = new Date(),
  role?: WorkbenchRole
): KpiSkuGroup[] {
  return buildKpiSkuGroups(
    filterLinesForRole(filterDailyLines(getShortageLines(orders), refDate), role)
  )
}

export function getProcurementSubmittedDetailGroups(
  orders: ShortagePO[],
  refDate = new Date(),
  role?: WorkbenchRole
): KpiSkuGroup[] {
  return buildKpiSkuGroups(
    filterLinesForRole(
      filterDailyLines(getShortageLines(orders), refDate).filter(isProcurementSubmittedLine),
      role
    )
  )
}

export function isPoLogisticsClosed(po: ShortagePO, role?: WorkbenchRole): boolean {
  const shortageLines = po.lines.filter((l) => l.isShortage)
  if (shortageLines.length === 0) return false
  if (role === 'sales') {
    const tracked = shortageLines.filter(isSalesTrackedShortageLine)
    return tracked.length > 0 && tracked.every(isFulfillmentDone)
  }
  return shortageLines.every(isFulfillmentDone)
}

function shortageLinesForPoDetail(po: ShortagePO, role?: WorkbenchRole): ShortagePOLine[] {
  const lines = po.lines.filter((l) => l.isShortage)
  if (role === 'sales') return lines.filter(isSalesTrackedShortageLine)
  return lines
}

function resolvePoTrackingNo(po: ShortagePO): string {
  for (const line of po.lines) {
    if (line.salesOutboundNo) return line.salesOutboundNo
    if (line.opsPoNumber) return line.opsPoNumber
  }
  return ''
}

export function getLogisticsClosedDetailGroups(
  orders: ShortagePO[],
  refDate = new Date(),
  role?: WorkbenchRole
): KpiClosedPoGroup[] {
  return orders
    .filter((po) => isDeliveryToday(po.requiredDeliveryDate, refDate) && isPoLogisticsClosed(po, role))
    .map((po) => ({
      poId: po.id,
      customerName: po.customerName,
      deliveryAddress: po.deliveryAddress,
      requiredDeliveryDate: po.requiredDeliveryDate,
      trackingNo: resolvePoTrackingNo(po),
      lines: shortageLinesForPoDetail(po, role).map((line) => ({
          lineId: line.id,
          sku: line.sku,
          productName: line.productName,
          spec: line.spec,
          gap: line.gap,
          unit: line.unit,
          signoffStatus: line.signoffStatus,
          signoffAt: line.signoffAt,
        })),
    }))
    .sort((a, b) => a.requiredDeliveryDate.localeCompare(b.requiredDeliveryDate))
}

export function countProcurementSubmitted(
  orders: ShortagePO[],
  refDate = new Date(),
  role?: WorkbenchRole
): number {
  return getProcurementSubmittedDetailGroups(orders, refDate, role).length
}

export function countLogisticsClosed(
  orders: ShortagePO[],
  refDate = new Date(),
  role?: WorkbenchRole
): number {
  return getLogisticsClosedDetailGroups(orders, refDate, role).length
}

export function countTodayShortageLines(
  orders: ShortagePO[],
  refDate = new Date(),
  role?: WorkbenchRole
): number {
  return getTodayShortageDetailGroups(orders, refDate, role).length
}

export function getPendingProcurementGroups(orders: ShortagePO[], refDate = new Date()): ProcurementSkuGroup[] {
  return groupBySku(orders, refDate)
}

export type ProcurementListSort = 'delivery' | 'supplier' | 'oa'

export type ProcurementSkuOaBucket = 'approved' | 'pending' | 'rejected' | 'none'

/** OA 排序：未提交 → 已驳回 → 审批中 → 已通过 */
const OA_BUCKET_RANK: Record<ProcurementSkuOaBucket, number> = {
  none: 0,
  rejected: 1,
  pending: 2,
  approved: 3,
}

function skuOaStatuses(group: ProcurementSkuGroup, orders: ShortagePO[]): OaApprovalStatus[] {
  return getShortageLines(orders)
    .filter((l) => l.sku === group.sku && isProcurementTaskHorizon(l.po.requiredDeliveryDate))
    .map((l) => l.oaApprovalStatus)
}

/** 品项任务清单 OA 分组：已通过 → 审批中 → 已驳回 */
export function getProcurementSkuOaBucket(
  group: ProcurementSkuGroup,
  orders: ShortagePO[]
): ProcurementSkuOaBucket {
  const statuses = skuOaStatuses(group, orders).filter((s) => s !== 'none')
  if (statuses.length === 0) return 'none'
  if (statuses.some((s) => s === 'pending')) return 'pending'
  if (statuses.every((s) => s === 'approved')) return 'approved'
  if (statuses.some((s) => s === 'rejected')) return 'rejected'
  if (statuses.some((s) => s === 'approved')) return 'approved'
  return 'none'
}

export function getProcurementSkuOaLabel(bucket: ProcurementSkuOaBucket): string {
  switch (bucket) {
    case 'approved':
      return OA_APPROVAL_STATUS_LABEL.approved
    case 'pending':
      return OA_APPROVAL_STATUS_LABEL.pending
    case 'rejected':
      return 'OA已驳回，待修改'
    default:
      return '新任务，还未提交'
  }
}

function procurementSkuOaRank(group: ProcurementSkuGroup, orders: ShortagePO[]): number {
  return OA_BUCKET_RANK[getProcurementSkuOaBucket(group, orders)]
}

export function sortProcurementSkuGroups(
  groups: ProcurementSkuGroup[],
  orders: ShortagePO[],
  sort: ProcurementListSort
): ProcurementSkuGroup[] {
  const copy = [...groups]
  if (sort === 'oa') {
    return copy.sort((a, b) => {
      const oaDiff = procurementSkuOaRank(a, orders) - procurementSkuOaRank(b, orders)
      if (oaDiff !== 0) return oaDiff
      return getSkuEarliestAwaitingFormDate(a, orders).localeCompare(
        getSkuEarliestAwaitingFormDate(b, orders)
      )
    })
  }
  return copy.sort((a, b) =>
    getSkuEarliestAwaitingFormDate(a, orders).localeCompare(getSkuEarliestAwaitingFormDate(b, orders))
  )
}

export function getProcurementSkuGroup(
  orders: ShortagePO[],
  sku: string,
  refDate = new Date()
): ProcurementSkuGroup | null {
  return getProcurementSkuGroupForPage(orders, sku, refDate)
}

/** 采购填写页：待办 + 近 3 日交期内已提交品项 */
export function getProcurementSkuGroupForPage(
  orders: ShortagePO[],
  sku: string,
  refDate = new Date()
): ProcurementSkuGroup | null {
  return (
    getPendingProcurementGroups(orders, refDate).find((g) => g.sku === sku) ??
    groupBySkuFulfillmentOverview(orders, refDate).find((g) => g.sku === sku) ??
    null
  )
}

export function isProcurementSkuPageReadOnly(
  group: ProcurementSkuGroup,
  orders: ShortagePO[]
): boolean {
  const bucket = getProcurementSkuOaBucket(group, orders)
  return bucket === 'pending' || bucket === 'approved'
}

/** 按品聚合：取各品下所有 PO 的最早 DDL，再选出全局最早（可并列多个品） */
export function getMostUrgentProcurementSkuGroups(
  orders: ShortagePO[],
  refDate = new Date()
): ProcurementSkuGroup[] {
  const groups = getPendingProcurementGroups(orders, refDate)
  if (groups.length === 0) return []

  let earliest = groups[0].earliestRequiredDate
  for (const g of groups) {
    if (g.earliestRequiredDate < earliest) earliest = g.earliestRequiredDate
  }
  return groups.filter((g) => g.earliestRequiredDate === earliest)
}

/** 已填写缺货处理信息、尚未按供应商发起采购订单 / OA 的订单行 */
export function getLinesAwaitingSupplierPoSubmit(
  orders: ShortagePO[],
  refDate = new Date()
): Array<ShortagePOLine & { po: ShortagePO }> {
  return filterProcurementTaskLines(getShortageLines(orders), refDate).filter(
    (line) =>
      !isLogisticsFulfillment(line.fulfillmentMethod) &&
      isProcurementLineSubmitted(line) &&
      line.oaApprovalStatus === 'none' &&
      !line.procurementConfirmed &&
      Boolean(line.supplierName?.trim())
  )
}

export function getProcurementSkuSubmittedSupplier(
  group: ProcurementSkuGroup,
  orders: ShortagePO[],
  refDate = new Date()
): string | null {
  const line = filterProcurementTaskLines(getShortageLines(orders), refDate).find(
    (l) => l.sku === group.sku && isProcurementLineSubmitted(l)
  )
  return line?.supplierName?.trim() || null
}

export function getSupplierProcurementBatches(
  orders: ShortagePO[],
  refDate = new Date()
): SupplierProcurementBatch[] {
  const awaiting = getLinesAwaitingSupplierPoSubmit(orders, refDate)
  const bySupplier = new Map<string, Array<ShortagePOLine & { po: ShortagePO }>>()
  for (const item of awaiting) {
    const name = item.supplierName!.trim()
    const list = bySupplier.get(name) ?? []
    list.push(item)
    bySupplier.set(name, list)
  }

  const allGroups = groupBySku(orders, refDate)
  const batches: SupplierProcurementBatch[] = []

  for (const [supplierName, items] of bySupplier) {
    const skus = new Set(items.map((i) => i.sku))
    const skuGroups = allGroups.filter((g) => skus.has(g.sku))
    const productNames = [...new Set(skuGroups.map((g) => g.productName))].slice(0, 4)
    batches.push({
      supplierName,
      skuCount: skus.size,
      lineCount: items.length,
      totalAmount: items.reduce((sum, i) => sum + (i.amount || 0), 0),
      productNames,
      skuGroups,
      lineIds: items.map((i) => i.id),
    })
  }

  return batches.sort((a, b) => a.supplierName.localeCompare(b.supplierName, 'zh-CN'))
}

export function formatMostUrgentProcurementReply(groups: ProcurementSkuGroup[]): string {
  if (groups.length === 0) return '采购待办已清空。'

  const dateLabel = groups[0].earliestRequiredDate.slice(5)
  if (groups.length === 1) {
    const g = groups[0]
    return `最紧急的是「${g.productName}」：该品下最早酒店 PO 交期 ${dateLabel}，共缺 ${g.totalGap}${g.unit}（涉及 ${g.lineCount} 个酒店 PO）。`
  }

  const lines = groups.map(
    (g, i) =>
      `${i + 1}. ${g.productName}（${g.spec} · 最早交期 ${g.earliestRequiredDate.slice(5)} · 共缺 ${g.totalGap}${g.unit} · 涉及 ${g.lineCount} 个酒店 PO）`
  )
  return `最紧急交期 ${dateLabel}，以下 ${groups.length} 个品并列：\n${lines.join('\n')}`
}
