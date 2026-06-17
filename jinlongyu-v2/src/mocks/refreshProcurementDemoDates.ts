import type { ShortagePO, ShortagePOLine } from '../types/shortage'
import { addCalendarDays } from '../utils/shortageAggregations'

function lineAwaitingProcurementForm(line: ShortagePOLine): boolean {
  if (!line.isShortage) return false
  if (line.procurementOutcome === 'pending' && line.fulfillmentMethod === 'pending') return true
  return line.oaApprovalStatus === 'rejected'
}

/** 任务清单演示：各 SKU 最早交期基准（相对今日 +N 天） */
const SKU_BASE_DAY_OFFSET: Record<string, number> = {
  'JLY-5L-001': 0,
  'JLY-1L-002': 1,
  'JLY-OA-REJECTED': 0,
  'JLY-900ML-001': 1,
  'JLY-10KG-003': 1,
}

/** 同 SKU 下各 PO 在基准上再错开的天数，保证多 PO 展示 3-5 天交期范围 */
const PO_DAY_SPREAD = [0, 3, 5, 1, 4] as const

/** 同 SKU 下各酒店售价错开，方便演示不同 PO 毛利 */
const UNIT_PRICE_SPREAD = [0, 6, -4, 9, -7, 3, 12, -10, 5, -2, 15, -12] as const

function withDemoUnitPrice(line: ShortagePOLine, index: number): ShortagePOLine {
  const offset = UNIT_PRICE_SPREAD[index % UNIT_PRICE_SPREAD.length]!
  const unitPrice = Math.max(1, line.unitPrice + offset)
  return {
    ...line,
    unitPrice,
    lineAmount: unitPrice * line.quantity,
  }
}

/**
 * 按当前日期重写待办 PO 交期，避免 mock 写死后滑出「任务窗口」导致列表最早交期全相同。
 */
export function refreshProcurementDemoDeliveryDates(
  orders: ShortagePO[],
  ref = new Date()
): ShortagePO[] {
  const poIndexBySku = new Map<string, number>()
  const lineIndexBySku = new Map<string, number>()

  return orders.map((po) => {
    const awaiting = po.lines.filter(lineAwaitingProcurementForm)
    if (awaiting.length === 0) return po
    if (po.id.startsWith('PO-SALES-')) return po

    const sku = awaiting[0]!.sku
    const base = SKU_BASE_DAY_OFFSET[sku] ?? 2
    const idx = poIndexBySku.get(sku) ?? 0
    poIndexBySku.set(sku, idx + 1)
    const dayOffset = base + PO_DAY_SPREAD[idx % PO_DAY_SPREAD.length]!

    return {
      ...po,
      requiredDeliveryDate: addCalendarDays(ref, dayOffset),
      lines: po.lines.map((line) => {
        if (!lineAwaitingProcurementForm(line)) return line
        const lineIndex = lineIndexBySku.get(line.sku) ?? 0
        lineIndexBySku.set(line.sku, lineIndex + 1)
        return withDemoUnitPrice(line, lineIndex)
      }),
    }
  })
}

/** 销售按酒店总览：仅销售通知专用 PO 对齐「今日」，避免覆盖采购 SKU 页交期范围 */
export function refreshSalesHotelDemoDeliveryDates(
  orders: ShortagePO[],
  ref = new Date()
): ShortagePO[] {
  const today = addCalendarDays(ref, 0)

  return orders.map((po) => {
    if (!po.id.startsWith('PO-SALES-')) return po

    return {
      ...po,
      requiredDeliveryDate: today,
    }
  })
}
