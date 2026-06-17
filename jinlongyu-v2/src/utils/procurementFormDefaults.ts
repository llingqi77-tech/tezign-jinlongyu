import type { ProcurementPoFormState, SkuHotelSubRow } from '../types/shortage'
import { getLastPurchasePrice, getLastSupplierForPo } from './supplierRecommendations'

export function createPoFormState(
  row: SkuHotelSubRow,
  sku: string,
  unitPrice = 0
): ProcurementPoFormState {
  return {
    fulfillmentMode: null,
    supplierName: getLastSupplierForPo(sku, row.poId).name,
    price: String(getLastPurchasePrice(sku, unitPrice)),
    eta: row.requiredDeliveryDate,
    deliveryMethod: 'warehouse',
    logisticsTrackingNo: '',
    remark: '',
    actualFulfillQty: String(row.gap),
  }
}

export function resolveActualFulfillQty(
  _fulfillmentMode: ProcurementPoFormState['fulfillmentMode'],
  demandGap: number
): number {
  return demandGap
}

/** 首个 PO 填齐后同步到同品项其余 PO 的字段 */
export const PROCUREMENT_FIRST_PO_MIRROR_KEYS = [
  'fulfillmentMode',
  'supplierName',
  'price',
  'eta',
  'deliveryMethod',
  'logisticsTrackingNo',
  'remark',
  'actualFulfillQty',
] as const satisfies readonly (keyof ProcurementPoFormState)[]

export type ProcurementPoMirrorFields = Pick<
  ProcurementPoFormState,
  (typeof PROCUREMENT_FIRST_PO_MIRROR_KEYS)[number]
>

export function isProcurementPoFormReadyToMirror(form: ProcurementPoFormState): boolean {
  if (!form.fulfillmentMode) return false
  if (!form.supplierName.trim()) return false
  const price = Number(form.price)
  if (!form.price.trim() || !Number.isFinite(price) || price <= 0) return false
  if (!form.eta.trim()) return false
  return true
}

export function pickProcurementPoMirrorFields(
  source: ProcurementPoFormState
): ProcurementPoMirrorFields {
  return {
    fulfillmentMode: source.fulfillmentMode,
    supplierName: source.supplierName,
    price: source.price,
    eta: source.eta,
    deliveryMethod: source.deliveryMethod,
    logisticsTrackingNo: source.logisticsTrackingNo,
    remark: source.remark,
    actualFulfillQty: source.actualFulfillQty,
  }
}
