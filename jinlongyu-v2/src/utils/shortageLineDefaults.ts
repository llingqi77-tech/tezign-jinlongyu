import type { ShortagePOLine } from '../types/shortage'
import { getLastPurchasePrice, getRecommendedSuppliers } from './supplierRecommendations'

export function withLineDefaults(
  partial: Partial<ShortagePOLine> & Pick<ShortagePOLine, 'id' | 'sku' | 'productName'>
): ShortagePOLine {
  const unitPrice = partial.unitPrice ?? 0
  const suppliers =
    partial.recommendedSuppliers ??
    (partial.isShortage !== false ? getRecommendedSuppliers(partial.sku) : [])
  const lastPrice = partial.lastPurchasePrice ?? getLastPurchasePrice(partial.sku, unitPrice)

  const base: ShortagePOLine = {
    spec: '',
    quantity: 0,
    unitPrice: 0,
    lineAmount: 0,
    unit: '件',
    isShortage: true,
    availableStock: 0,
    gap: 0,
    fulfillmentMethod: 'pending',
    salesNote: '',
    salesOutboundType: null,
    salesOutboundNo: '',
    actualFulfillQty: 0,
    signoffStatus: 'pending',
    signoffAt: '',
    recommendedSuppliers: suppliers,
    selectedSupplierId: '',
    supplierName: '',
    procurementPrice: lastPrice,
    lastPurchasePrice: lastPrice,
    amount: 0,
    procurementDraftNo: '',
    procurementConfirmed: false,
    oaApprovalStatus: 'none',
    oaRequestNo: '',
    eta: '',
    deliveryMethod: null,
    procurementOutcome: 'pending',
    isExpedited: false,
    expediteFee: 0,
    procurementMode: 'pending',
    status: 'new',
    opsPoNumber: '',
    logisticsTrackingNo: '',
    salesProcurementNotifiedAt: '',
    id: partial.id,
    sku: partial.sku,
    productName: partial.productName,
  }

  return { ...base, ...partial, recommendedSuppliers: partial.recommendedSuppliers ?? suppliers }
}
