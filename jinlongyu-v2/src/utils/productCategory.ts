import type { ProductCategoryKey } from '../types/shortage'

export const PRODUCT_CATEGORY_ORDER: ProductCategoryKey[] = [
  'oil',
  'rice',
  'noodle',
  'dry_spice',
  'other',
]

export const PRODUCT_CATEGORY_LABEL: Record<ProductCategoryKey, string> = {
  oil: '油类',
  rice: '米类',
  noodle: '面类',
  dry_spice: '干调类',
  other: '其他',
}

const CATEGORY_ALIAS: Record<string, ProductCategoryKey> = {
  油: 'oil',
  油类: 'oil',
  米: 'rice',
  米类: 'rice',
  面: 'noodle',
  面类: 'noodle',
  米面: 'rice',
  米面类: 'rice',
  干调: 'dry_spice',
  干调类: 'dry_spice',
  其他: 'other',
}

export function resolveProductCategory(line: {
  productName: string
  sku: string
  procurementCategory?: string
}): ProductCategoryKey {
  const alias = line.procurementCategory?.trim()
  if (alias && CATEGORY_ALIAS[alias]) return CATEGORY_ALIAS[alias]

  const name = line.productName
  if (/大米/.test(name)) return 'rice'
  if (/面条|挂面|意面|米线|米粉|面粉|面片|面皮/.test(name)) return 'noodle'
  if (/酱油|醋|料酒|调料|酱料|食盐|白糖|味精|干货|香料/.test(name)) return 'dry_spice'
  if (/油/.test(name) && !/酱油|色拉|调味油/.test(name)) return 'oil'
  return 'other'
}

export function groupItemsByProductCategory<T extends { productName: string; sku: string }>(
  items: T[]
): Array<{ key: ProductCategoryKey; label: string; items: T[] }> {
  const buckets = new Map<ProductCategoryKey, T[]>()
  for (const key of PRODUCT_CATEGORY_ORDER) buckets.set(key, [])
  for (const item of items) {
    const key = resolveProductCategory(item)
    buckets.get(key)!.push(item)
  }
  return PRODUCT_CATEGORY_ORDER.map((key) => ({
    key,
    label: PRODUCT_CATEGORY_LABEL[key],
    items: buckets.get(key) ?? [],
  })).filter((section) => section.items.length > 0)
}
