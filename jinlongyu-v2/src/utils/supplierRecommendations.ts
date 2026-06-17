import type { SupplierCandidate } from '../types/shortage'

const SUPPLIER_POOL = [
  '益海嘉里华北供应链',
  '北京粮油批发中心',
  '华东粮油加急仓',
  '中粮贸易华东区',
  '上海益海物流',
  '广州粮油集散中心',
]

function hashSku(sku: string): number {
  let h = 0
  for (let i = 0; i < sku.length; i++) h = (h * 31 + sku.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function getPrimarySupplier(sku: string): SupplierCandidate {
  const idx = hashSku(sku) % SUPPLIER_POOL.length
  return { id: `sup-${sku}-primary`, name: SUPPLIER_POOL[idx] }
}

/** 按 SKU+PO 带出上次下单供应商（演示：不同 PO 可能不同） */
export function getLastSupplierForPo(sku: string, poId: string): SupplierCandidate {
  const idx = hashSku(`${sku}::${poId}`) % SUPPLIER_POOL.length
  return { id: `sup-${sku}-${poId.slice(-4)}`, name: SUPPLIER_POOL[idx] }
}

export function getRecommendedSuppliers(sku: string): SupplierCandidate[] {
  return [getPrimarySupplier(sku)]
}

export function getLastPurchasePrice(sku: string, unitPrice: number): number {
  const offset = (hashSku(sku) % 5) - 2
  return Math.max(1, unitPrice + offset)
}

/** 演示：供应商常规供货周期（天） */
export function getSupplierLeadTimeDays(sku: string, supplierName: string): number {
  if (!supplierName.trim()) return 5
  return 3 + (hashSku(`${sku}::${supplierName}`) % 5)
}
