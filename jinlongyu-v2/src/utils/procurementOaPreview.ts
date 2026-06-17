import type {
  ProcurementOaPreviewOutcome,
  ProcurementPoFormState,
  ProcurementSkuGroup,
  ShortagePO,
} from '../types/shortage'
import {
  OA_NOTIFY_PREVIEW_REJECT_REASON,
  oaNotifyPreviewDeliveryLabel,
} from '../constants/oaNotifyPreview'

export type ProcurementOaPoOverlayModel = {
  outcome: ProcurementOaPreviewOutcome
  productName: string
  spec: string
  requiredDeliveryLabel: string
  oaRequestNo: string
  rejectReason: string | null
  suppliers: Array<{
    name: string
    qty: number
    unit: string
    unitPrice: number
    amount: number
  }>
  totalQty: number
  unit: string
  totalAmount: number
}

export function buildPoFormStateFromOrders(
  group: ProcurementSkuGroup,
  orders: ShortagePO[]
): Record<string, ProcurementPoFormState> {
  const map: Record<string, ProcurementPoFormState> = {}
  for (const row of group.hotelRows) {
    let line = null
    for (const po of orders) {
      line = po.lines.find((l) => l.id === row.lineId) ?? null
      if (line) break
    }
    if (!line) continue
    map[row.lineId] = {
      fulfillmentMode: line.procurementMode === 'urgent' ? 'urgent' : 'defer',
      supplierName: line.supplierName,
      price: String(line.procurementPrice || line.unitPrice),
      eta: line.eta || row.requiredDeliveryDate,
      deliveryMethod: line.deliveryMethod ?? 'warehouse',
      logisticsTrackingNo: line.logisticsTrackingNo ?? '',
      remark: line.salesNote,
      actualFulfillQty: String(line.actualFulfillQty || row.gap),
    }
  }
  return map
}

export function buildProcurementOaPoOverlayModel(
  group: ProcurementSkuGroup,
  forms: Record<string, ProcurementPoFormState>,
  outcome: ProcurementOaPreviewOutcome,
  oaRequestNo: string
): ProcurementOaPoOverlayModel {
  const supplierMap = new Map<string, { qty: number; unitPrice: number; amount: number }>()

  for (const row of group.hotelRows) {
    const form = forms[row.lineId]
    if (!form || form.fulfillmentMode !== 'urgent') continue
    const qty = row.gap
    const unitPrice = Number(form.price) || 0
    const amount = qty * unitPrice
    const name = form.supplierName.trim() || '—'
    const prev = supplierMap.get(name)
    if (prev) {
      prev.qty += qty
      prev.amount += amount
    } else {
      supplierMap.set(name, { qty, unitPrice, amount })
    }
  }

  const suppliers = [...supplierMap.entries()].map(([name, v]) => ({
    name,
    qty: v.qty,
    unit: group.unit,
    unitPrice: v.unitPrice,
    amount: v.amount,
  }))

  const totalQty = suppliers.reduce((s, x) => s + x.qty, 0)
  const totalAmount = suppliers.reduce((s, x) => s + x.amount, 0)

  return {
    outcome,
    productName: group.productName,
    spec: group.spec,
    requiredDeliveryLabel: oaNotifyPreviewDeliveryLabel(),
    oaRequestNo,
    rejectReason: outcome === 'rejected' ? OA_NOTIFY_PREVIEW_REJECT_REASON : null,
    suppliers,
    totalQty,
    unit: group.unit,
    totalAmount,
  }
}

export function resolvePreviewOaRequestNo(orders: ShortagePO[], sku: string): string {
  for (const po of orders) {
    for (const line of po.lines) {
      if (line.sku === sku && line.oaRequestNo) return line.oaRequestNo
    }
  }
  return 'OA-20902866'
}
