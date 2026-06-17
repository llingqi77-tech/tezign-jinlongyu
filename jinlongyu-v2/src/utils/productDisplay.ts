/** 品项展示：名称 + 规格 */
export function formatSkuProductTitle(productName: string, spec: string): string {
  const s = spec.trim()
  return s ? `${productName} ${s}` : productName
}
