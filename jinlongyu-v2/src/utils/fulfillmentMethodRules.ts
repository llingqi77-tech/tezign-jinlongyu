import type { FulfillmentMethod, ShortagePO, ShortagePOLine } from '../types/shortage'

export const LOGISTICS_FULFILLMENT_METHODS = ['direct_ship', 'normal_replenishment'] as const

export function isLogisticsFulfillment(method: FulfillmentMethod): boolean {
  return method === 'direct_ship' || method === 'normal_replenishment'
}

export function lineNeedsProcurementAction(line: ShortagePOLine): boolean {
  if (!line.isShortage) return false
  if (isLogisticsFulfillment(line.fulfillmentMethod)) return false
  if (line.procurementOutcome === 'not_satisfied') return false
  if (line.procurementOutcome === 'satisfied' && line.procurementConfirmed) return false
  return true
}

export function resolveBackendLogisticsMethod(
  line: ShortagePOLine,
  _po: ShortagePO
): FulfillmentMethod | null {
  if (!line.isShortage || line.fulfillmentMethod !== 'pending') return null
  if (line.hasInTransitOrder) return 'normal_replenishment'
  return null
}
