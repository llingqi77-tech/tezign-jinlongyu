import type {
  FulfillmentCategoryRow,
  FulfillmentDataPanelState,
  FulfillmentProcessedSkuRow,
  FulfillmentSkuRow,
  ProductCategoryKey,
  ShortagePO,
} from '../types/shortage'
import { formatSkuProductTitle } from './productDisplay'
import { PRODUCT_CATEGORY_LABEL, PRODUCT_CATEGORY_ORDER, resolveProductCategory } from './productCategory'
import {
  getShortageLines,
  groupBySkuFulfillmentOverview,
  isProcurementLineOaSubmitted,
  isProcurementTaskHorizon,
  resolveSkuOaProgressLabel,
  type FulfillmentOverviewSkuGroup,
} from './shortageAggregations'

export const FULFILLMENT_CMD_PREFIX = '__fulfillment__:'

export function formatFulfillmentSkuSub(
  totalGap: number,
  unit: string,
  lineCount: number,
  unitPrice: number
): string {
  return `共缺 ${totalGap}${unit} · 涉及 ${lineCount} 个酒店 PO · 售价 ¥${unitPrice}/${unit}`
}

export function isFulfillmentCommand(text: string): boolean {
  return text.startsWith(FULFILLMENT_CMD_PREFIX)
}

function earliestPoDate(group: FulfillmentOverviewSkuGroup): string {
  if (group.hotelRows.length === 0) return '—'
  let min = group.hotelRows[0].requiredDeliveryDate
  for (const row of group.hotelRows) {
    if (row.requiredDeliveryDate < min) min = row.requiredDeliveryDate
  }
  return min.slice(5)
}

function skuLinesForGroup(orders: ShortagePO[], sku: string, refDate = new Date()) {
  return getShortageLines(orders).filter(
    (l) => l.sku === sku && isProcurementTaskHorizon(l.po.requiredDeliveryDate, refDate)
  )
}

function toPendingSkuRow(group: FulfillmentOverviewSkuGroup): FulfillmentSkuRow {
  return {
    sku: group.sku,
    title: formatSkuProductTitle(group.productName, group.spec),
    totalGap: group.totalGap,
    unit: group.unit,
    unitPrice: group.unitPrice,
    lineCount: group.lineCount,
    earliestDelivery: earliestPoDate(group),
    statusKind: 'pending',
    statusLabel: '待处理',
    pendingPoCount: group.pendingPoCount,
    processedPoCount: group.processedPoCount,
  }
}

/** 履约面板行 id → 采购填写页 SKU（已处理行可能带 ::加急 / ::延期 后缀） */
export function resolveFulfillmentRowSkuId(rowSku: string): string {
  const sep = rowSku.indexOf('::')
  return sep >= 0 ? rowSku.slice(0, sep) : rowSku
}

/** 履约面板已处理（采购）：审批中 / 已通过仅查看；已驳回可改 */
export function isFulfillmentProcessedSkuReadOnly(oaLabel: string): boolean {
  return oaLabel === '审批中' || oaLabel === '已通过'
}

/** 履约卡片标签 → 采购填写页入口状态（待处理 → 待采购处理） */
export function fulfillmentSkuHeaderLabel(pending: boolean, oaLabel?: string): string {
  if (pending) return '待采购处理'
  return oaLabel?.trim() || '待采购处理'
}

/** 与履约列表标签 / 入口状态一致的说明文案 */
export function procurementSkuPageHint(
  entryLabel: string,
  opts: { readOnly: boolean; oaPreviewApproved?: boolean; oaPreviewRejected?: boolean }
): string {
  const { readOnly, oaPreviewApproved, oaPreviewRejected } = opts
  if (oaPreviewApproved || entryLabel === '已通过') {
    return 'OA 已通过，采购订单已生成，以下信息仅供查看'
  }
  if (oaPreviewRejected || entryLabel === '已驳回') {
    return readOnly
      ? '已驳回，以下信息仅供查看'
      : '请根据驳回原因修改各 PO 后重新提交 OA'
  }
  if (entryLabel === '审批中') {
    return 'OA 审批中，以下信息仅供查看'
  }
  if (readOnly) {
    return '待采购处理，以下信息仅供查看'
  }
  return '需为每个酒店 PO 选择履约方式并填写后提交'
}

function earliestDateFromLines(
  lines: Array<{ po: { requiredDeliveryDate: string } }>
): string {
  if (lines.length === 0) return '—'
  let min = lines[0].po.requiredDeliveryDate
  for (const l of lines) {
    if (l.po.requiredDeliveryDate < min) min = l.po.requiredDeliveryDate
  }
  return min.slice(5)
}

function expandProcessedSkuRows(
  group: FulfillmentOverviewSkuGroup,
  orders: ShortagePO[]
): FulfillmentProcessedSkuRow[] {
  const title = formatSkuProductTitle(group.productName, group.spec)
  const oaLines = skuLinesForGroup(orders, group.sku).filter(isProcurementLineOaSubmitted)
  if (oaLines.length === 0) return []

  const urgentLines = oaLines.filter((l) => l.procurementOutcome === 'satisfied')
  const deferLines = oaLines.filter((l) => l.procurementOutcome === 'not_satisfied')

  const build = (
    handlingLabel: '加急' | '延期',
    lines: typeof oaLines
  ): FulfillmentProcessedSkuRow => ({
    sku: `${group.sku}::${handlingLabel}`,
    title,
    totalGap: lines.reduce((s, l) => s + l.gap, 0),
    unit: group.unit,
    unitPrice: group.unitPrice,
    lineCount: lines.length,
    earliestDelivery: earliestDateFromLines(lines),
    handlingLabel,
    oaLabel: resolveSkuOaProgressLabel(lines),
  })

  const rows: FulfillmentProcessedSkuRow[] = []
  if (urgentLines.length > 0) rows.push(build('加急', urgentLines))
  if (deferLines.length > 0) rows.push(build('延期', deferLines))
  return rows
}

function skuBucketsForCategory(
  groups: FulfillmentOverviewSkuGroup[],
  category: ProductCategoryKey,
  orders: ShortagePO[]
): { pendingSkus: FulfillmentSkuRow[]; processedSkus: FulfillmentProcessedSkuRow[] } {
  const inCat = groups.filter((g) => resolveProductCategory(g) === category)
  const pendingSkus = inCat
    .filter((g) => g.pendingPoCount > 0)
    .map(toPendingSkuRow)
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
  const processedSkus = inCat
    .flatMap((g) => expandProcessedSkuRows(g, orders))
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
  return { pendingSkus, processedSkus }
}

export function buildFulfillmentCategoryRows(
  orders: Parameters<typeof groupBySkuFulfillmentOverview>[0]
): FulfillmentCategoryRow[] {
  const groups = groupBySkuFulfillmentOverview(orders)
  const counts = new Map<ProductCategoryKey, { total: number; pending: number }>()
  for (const key of PRODUCT_CATEGORY_ORDER) counts.set(key, { total: 0, pending: 0 })
  for (const g of groups) {
    const key = resolveProductCategory(g)
    const bucket = counts.get(key)!
    bucket.total += 1
    if (g.pendingPoCount > 0) bucket.pending += 1
  }
  return PRODUCT_CATEGORY_ORDER.map((key) => ({
    key,
    label: PRODUCT_CATEGORY_LABEL[key],
    totalSkuCount: counts.get(key)?.total ?? 0,
    pendingSkuCount: counts.get(key)?.pending ?? 0,
  })).filter((row) => row.totalSkuCount > 0)
}

export function buildFulfillmentPanelState(
  command: string,
  orders: Parameters<typeof groupBySkuFulfillmentOverview>[0]
): FulfillmentDataPanelState | null {
  const groups = groupBySkuFulfillmentOverview(orders)

  if (command === `${FULFILLMENT_CMD_PREFIX}open`) {
    return { level: 'categories', categories: buildFulfillmentCategoryRows(orders) }
  }

  if (command === `${FULFILLMENT_CMD_PREFIX}back`) {
    return { level: 'categories', categories: buildFulfillmentCategoryRows(orders) }
  }

  const catMatch = command.match(/^__fulfillment__:cat:(oil|rice|noodle|dry_spice|other)$/)
  if (catMatch) {
    const key = catMatch[1] as ProductCategoryKey
    const { pendingSkus, processedSkus } = skuBucketsForCategory(groups, key, orders)
    return {
      level: 'skus',
      categoryKey: key,
      categoryLabel: PRODUCT_CATEGORY_LABEL[key],
      pendingSkus,
      processedSkus,
    }
  }

  return null
}

export function fulfillmentReplyForCommand(
  command: string,
  orders: Parameters<typeof groupBySkuFulfillmentOverview>[0]
): { text: string; panel: FulfillmentDataPanelState } | null {
  const panel = buildFulfillmentPanelState(command, orders)
  if (!panel) return null

  if (panel.level === 'categories') {
    if (panel.categories.length === 0) {
      return {
        text: '近 3 日交期内暂无缺货记录。',
        panel,
      }
    }
    return {
      text: '点选品类查看待处理与已提交明细。',
      panel,
    }
  }

  const pendingCount = panel.pendingSkus.length
  const processedCount = panel.processedSkus.length
  if (pendingCount + processedCount === 0) {
    return {
      text: `${panel.categoryLabel}在近 3 日交期内暂无缺货记录。`,
      panel,
    }
  }
  return {
    text: `${panel.categoryLabel}：待处理 ${pendingCount} 个、已处理 ${processedCount} 个。已处理项标注加急/延期与 OA 进度。`,
    panel,
  }
}
