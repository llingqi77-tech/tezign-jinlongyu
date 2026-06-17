import type {
  HistoryEntity,
  HistoryFulfillmentKind,
  HistoryHotelGroup,
  HistoryOrder,
  HistoryOrderFilter,
  HistoryOrderStatus,
  HistoryOrderSummary,
  HistorySkuGroup,
} from '../types/shortage'
import { MOCK_SALES_HISTORY_ORDERS } from '../mocks/salesHistoryOrders'
import { resolveProductCategory } from './productCategory'

export const HISTORY_ENTITY_OPTIONS: HistoryEntity[] = ['丰厨供应链', '益海嘉里德立安']

/** 日期筛选最长跨度（含起止日） */
export const HISTORY_MAX_DATE_RANGE_DAYS = 7

export const HISTORY_STATUS_LABEL: Record<HistoryOrderStatus, string> = {
  completed: '已完成',
  partial: '部分完成',
  deferred: '未完成',
}

export const HISTORY_KIND_LABEL: Record<HistoryFulfillmentKind, string> = {
  direct: '直发',
  replenish: '正常补货',
  urgent: '加急',
  defer: '延期',
}

/** 品 / 酒店的签收档位：全签 / 部分签 / 未签 */
export type HistorySignedState = 'all' | 'partial' | 'none'

export function getSkuSignedState(group: { totalQty: number; signedQty: number }): HistorySignedState {
  if (group.totalQty > 0 && group.signedQty >= group.totalQty) return 'all'
  if (group.signedQty > 0) return 'partial'
  return 'none'
}

/** 订单行签收档位：按 PO 行数统计，非按袋/桶数量 */
export function getPoLineSignedState(pos: { signed: boolean }[]): HistorySignedState {
  if (pos.length === 0) return 'none'
  const signedCount = pos.filter((p) => p.signed).length
  if (signedCount >= pos.length) return 'all'
  if (signedCount > 0) return 'partial'
  return 'none'
}

export function getPoLineFulfillRate(signedLines: number, totalLines: number): number {
  return totalLines > 0 ? Math.round((signedLines / totalLines) * 100) : 0
}

export function countSignedPoLines(pos: { signed: boolean }[]): { signed: number; total: number } {
  const total = pos.length
  const signed = pos.filter((p) => p.signed).length
  return { signed, total }
}

export function getHotelPoLineCounts(hotel: HistoryHotelGroup): { signed: number; total: number } {
  let signed = 0
  let total = 0
  for (const sku of hotel.skuGroups) {
    const counts = countSignedPoLines(sku.pos)
    signed += counts.signed
    total += counts.total
  }
  return { signed, total }
}

/** 酒店完成状态：全部 PO 订单行已签收为「已完成」，否则「未完成」 */
export function getHotelGroupStatus(group: HistoryHotelGroup): HistoryOrderStatus {
  const { signed, total } = getHotelPoLineCounts(group)
  return total > 0 && signed >= total ? 'completed' : 'deferred'
}

/**
 * 按「酒店 → 品(SKU) → PO」聚合：
 * 同一酒店在筛选范围内对同一 SKU 的多次缺货（多张 PO）合并到一个品下，
 * 品级汇总总缺货数量 / 已签收数量，并保留各 PO 明细（含各自收货日期）。
 */
export function groupHistoryByHotel(orders: HistoryOrder[]): HistoryHotelGroup[] {
  const hotelMap = new Map<string, HistoryHotelGroup>()

  for (const order of orders) {
    let hotel = hotelMap.get(order.hotelName)
    if (!hotel) {
      hotel = { hotelName: order.hotelName, city: order.city, totalQty: 0, signedQty: 0, skuGroups: [] }
      hotelMap.set(order.hotelName, hotel)
    }
    for (const line of order.lines) {
      let sku = hotel.skuGroups.find((s) => s.sku === line.sku)
      if (!sku) {
        sku = {
          sku: line.sku,
          productName: line.productName,
          spec: line.spec,
          unit: line.unit,
          totalQty: 0,
          signedQty: 0,
          poCount: 0,
          pos: [],
        }
        hotel.skuGroups.push(sku)
      }
      sku.pos.push({
        poNo: order.id,
        deliveryDate: line.deliveryDate,
        qty: line.qty,
        kind: line.kind,
        signed: line.signed,
        supplierName: line.supplierName,
      })
      sku.poCount += 1
      sku.totalQty += line.qty
      if (line.signed) sku.signedQty += line.qty
    }
  }

  const groups = [...hotelMap.values()]
  for (const hotel of groups) {
    for (const sku of hotel.skuGroups) {
      sku.pos.sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate))
      hotel.totalQty += sku.totalQty
      hotel.signedQty += sku.signedQty
    }
    hotel.skuGroups.sort((a, b) => a.productName.localeCompare(b.productName, 'zh-CN'))
  }
  groups.sort(
    (a, b) =>
      a.city.localeCompare(b.city, 'zh-CN') || a.hotelName.localeCompare(b.hotelName, 'zh-CN'),
  )
  return groups
}

/**
 * 按「品(SKU) → PO」全局聚合（采购视角，不分酒店）：
 * 把所有酒店对同一 SKU 的缺货合并到一个品下，汇总总缺货 / 已签收数量，
 * 并保留各 PO（含所属酒店），用于点品下钻查看跨酒店的 PO 明细。
 */
export function groupHistoryBySku(orders: HistoryOrder[]): HistorySkuGroup[] {
  type Acc = HistorySkuGroup & { hotelSet: Set<string> }
  const map = new Map<string, Acc>()

  for (const order of orders) {
    for (const line of order.lines) {
      let group = map.get(line.sku)
      if (!group) {
        group = {
          sku: line.sku,
          productName: line.productName,
          spec: line.spec,
          unit: line.unit,
          totalQty: 0,
          signedQty: 0,
          poCount: 0,
          hotelCount: 0,
          pos: [],
          hotelSet: new Set<string>(),
        }
        map.set(line.sku, group)
      }
      group.pos.push({
        poNo: order.id,
        hotelName: order.hotelName,
        deliveryDate: line.deliveryDate,
        qty: line.qty,
        kind: line.kind,
        signed: line.signed,
        supplierName: line.supplierName,
      })
      group.poCount += 1
      group.totalQty += line.qty
      if (line.signed) group.signedQty += line.qty
      group.hotelSet.add(order.hotelName)
    }
  }

  const groups = [...map.values()].map(({ hotelSet, ...rest }) => {
    rest.hotelCount = hotelSet.size
    rest.pos.sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate))
    return rest
  })
  groups.sort((a, b) => a.productName.localeCompare(b.productName, 'zh-CN'))
  return groups
}

export function getHistoryCities(): string[] {
  return [...new Set(MOCK_SALES_HISTORY_ORDERS.map((o) => o.city))]
}

export function getHistoryEntities(city: string | null): HistoryEntity[] {
  const source = city
    ? MOCK_SALES_HISTORY_ORDERS.filter((o) => o.city === city)
    : MOCK_SALES_HISTORY_ORDERS
  return [...new Set(source.map((o) => o.entity))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

export function getHistoryHotels(city: string | null, entity: HistoryEntity | null): string[] {
  let source = MOCK_SALES_HISTORY_ORDERS
  if (city) source = source.filter((o) => o.city === city)
  if (entity) source = source.filter((o) => o.entity === entity)
  return [...new Set(source.map((o) => o.hotelName))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

export function filterHistoryOrders(filter: HistoryOrderFilter): HistoryOrder[] {
  const matched = MOCK_SALES_HISTORY_ORDERS.filter((o) => {
    if (filter.city && o.city !== filter.city) return false
    if (filter.entity && o.entity !== filter.entity) return false
    if (filter.hotel && o.hotelName !== filter.hotel) return false
    if (filter.start && o.deliveryDate < filter.start) return false
    if (filter.end && o.deliveryDate > filter.end) return false
    return true
  })
  if (!filter.category) return matched
  return matched
    .map((o) => ({
      ...o,
      lines: o.lines.filter((line) => resolveProductCategory(line) === filter.category),
    }))
    .filter((o) => o.lines.length > 0)
}

export function summarizeHistoryOrders(orders: HistoryOrder[]): HistoryOrderSummary {
  const hotelGroups = groupHistoryByHotel(orders)
  const skuGroups = groupHistoryBySku(orders)

  const skuCount = skuGroups.length
  const skuFulfilledCount = skuGroups.filter(
    (g) => g.pos.length > 0 && g.pos.every((p) => p.signed),
  ).length

  let lineCount = 0
  let lineFulfilledCount = 0
  for (const order of orders) {
    for (const line of order.lines) {
      lineCount += 1
      if (line.signed) lineFulfilledCount += 1
    }
  }

  return {
    hotelCount: hotelGroups.length,
    skuCount,
    skuFulfilledCount,
    skuFulfillRate: getPoLineFulfillRate(skuFulfilledCount, skuCount),
    lineCount,
    lineFulfilledCount,
    lineFulfillRate: getPoLineFulfillRate(lineFulfilledCount, lineCount),
  }
}

/** 将结束日期限制在起始日期起最多 HISTORY_MAX_DATE_RANGE_DAYS 天内（含首尾） */
export function clampHistoryDateRange(start: string, end: string): { start: string; end: string } {
  if (!start || !end) return { start, end }
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  const maxEnd = new Date(startDate)
  maxEnd.setDate(maxEnd.getDate() + HISTORY_MAX_DATE_RANGE_DAYS - 1)
  if (endDate > maxEnd) {
    const y = maxEnd.getFullYear()
    const m = String(maxEnd.getMonth() + 1).padStart(2, '0')
    const d = String(maxEnd.getDate()).padStart(2, '0')
    return { start, end: `${y}-${m}-${d}` }
  }
  return { start, end }
}

/** 默认筛选区间：最近 7 天（含今日） */
export function getDefaultHistoryFilter(): HistoryOrderFilter {
  const today = new Date()
  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (HISTORY_MAX_DATE_RANGE_DAYS - 1))
  return { city: null, entity: null, hotel: null, start: fmt(start), end: fmt(today), category: null }
}
