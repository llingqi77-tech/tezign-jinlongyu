import type {
  HistoryEntity,
  HistoryOrder,
  HistoryFulfillmentKind,
  OaApprovalStatus,
  ShortagePO,
} from '../types/shortage'
import { addCalendarDays } from '../utils/shortageAggregations'
import { withLineDefaults } from '../utils/shortageLineDefaults'
import { getRecommendedSuppliers } from '../utils/supplierRecommendations'
import { DEMO_SALES_HOTEL_OVERVIEW_ROWS } from './salesHotelOverviewDemo'

export const DEMO_INFINITE_LIST_SIZE = 20

const DEMO_HOTELS = DEMO_SALES_HOTEL_OVERVIEW_ROWS.slice(0, DEMO_INFINITE_LIST_SIZE)

const CITY_PREFIXES: [string, string][] = [
  ['北京', '北京'],
  ['上海', '上海'],
  ['广州', '广州'],
  ['深圳', '深圳'],
  ['成都', '成都'],
  ['杭州', '杭州'],
  ['南京', '南京'],
  ['西安', '西安'],
  ['厦门', '厦门'],
  ['青岛', '青岛'],
  ['重庆', '重庆'],
  ['三亚', '广州'],
  ['苏州', '上海'],
  ['武汉', '成都'],
]

function inferCity(hotelName: string, index: number): string {
  for (const [prefix, city] of CITY_PREFIXES) {
    if (hotelName.startsWith(prefix)) return city
  }
  return ['北京', '上海', '广州', '成都'][index % 4]
}

function inferEntity(index: number): HistoryEntity {
  return index % 2 === 0 ? '丰厨供应链' : '益海嘉里德立安'
}

export const DEMO_SCROLL_PRODUCTS = Array.from({ length: DEMO_INFINITE_LIST_SIZE }, (_, i) => ({
  sku: `JLY-SCR-${String(i + 1).padStart(3, '0')}`,
  productName: `金龙鱼演示商品 ${i + 1}`,
  spec: `${(i % 4) + 1}kg/袋`,
  unit: '袋',
}))

function oaLine(
  seed: { id: string; sku: string; productName: string; spec: string; unit: string; gap: number },
  oaStatus: OaApprovalStatus
) {
  const suppliers = getRecommendedSuppliers(seed.sku)
  return withLineDefaults({
    ...seed,
    quantity: seed.gap + 20,
    unitPrice: 68,
    lineAmount: 0,
    fulfillmentMethod: 'satisfied',
    procurementOutcome: 'satisfied',
    procurementMode: 'urgent',
    procurementConfirmed: false,
    procurementDraftNo: `DRAFT-SCR-${seed.id.slice(-4)}`,
    recommendedSuppliers: suppliers,
    selectedSupplierId: suppliers[0]?.id ?? '',
    supplierName: suppliers[0]?.name ?? '华东粮油加急仓',
    procurementPrice: 65,
    amount: 65 * seed.gap,
    oaApprovalStatus: oaStatus,
    oaRequestNo: `OA-SCR-${seed.id.slice(-4)}`,
    deliveryMethod: 'warehouse',
    eta: addCalendarDays(new Date(), 0),
    status: 'await_procurement',
  })
}

/** 历史订单：默认 7 天窗口内 20 家酒店、20 个 SKU */
export function buildDemoHistoryScrollOrders(): HistoryOrder[] {
  const today = new Date()
  const kinds: HistoryFulfillmentKind[] = ['urgent', 'defer']

  return DEMO_HOTELS.map((hotel, i) => {
    const product = DEMO_SCROLL_PRODUCTS[i]
    const dayOffset = -(i % 6)
    const deliveryDate = addCalendarDays(today, dayOffset)
    const signed = i % 3 !== 0
    return {
      id: `HO-DEMO-SCROLL-${String(i + 1).padStart(2, '0')}`,
      city: inferCity(hotel.hotelName, i),
      entity: inferEntity(i),
      hotelName: hotel.hotelName,
      deliveryAddress: hotel.deliveryAddress,
      deliveryDate,
      lines: [
        {
          sku: product.sku,
          productName: product.productName,
          spec: product.spec,
          unit: product.unit,
          qty: 12 + i * 4,
          kind: kinds[i % kinds.length],
          signed,
          deliveryDate,
          supplierName: '益海嘉里粮油（上海）有限公司',
        },
      ],
    }
  })
}

/** 采购待处理：20 个独立 SKU */
export function buildDemoProcurementPendingOrders(): ShortagePO[] {
  const today = new Date()
  return DEMO_SCROLL_PRODUCTS.map((product, i) => {
    const hotel = DEMO_HOTELS[i]
    return {
      id: `PO-DEMO-SCR-PENDING-${String(i + 1).padStart(2, '0')}`,
      customerName: hotel.hotelName,
      deliveryAddress: hotel.deliveryAddress,
      orderDepartment: '餐饮部',
      specialNote: '演示无限滚动 · 待处理缺货',
      requiredDeliveryDate: addCalendarDays(today, i % 3),
      lines: [
        withLineDefaults({
          id: `L-SCR-P-${String(i + 1).padStart(3, '0')}`,
          sku: product.sku,
          productName: product.productName,
          spec: product.spec,
          unit: product.unit,
          gap: 10 + i * 2,
          fulfillmentMethod: 'pending',
          status: 'await_procurement',
          procurementOutcome: 'pending',
        }),
      ],
    }
  })
}

/** OA 进度：20 个独立 SKU（审批中） */
export function buildDemoProcurementOaOrders(): ShortagePO[] {
  const today = new Date()
  return DEMO_SCROLL_PRODUCTS.map((product, i) => {
    const hotel = DEMO_HOTELS[i]
    return {
      id: `PO-DEMO-SCR-OA-${String(i + 1).padStart(2, '0')}`,
      customerName: hotel.hotelName,
      deliveryAddress: hotel.deliveryAddress,
      orderDepartment: '餐饮部',
      specialNote: '演示无限滚动 · OA 审批中',
      requiredDeliveryDate: addCalendarDays(today, i % 3),
      lines: [
        oaLine(
          {
            id: `L-SCR-OA-${String(i + 1).padStart(3, '0')}`,
            sku: `JLY-SCR-OA-${String(i + 1).padStart(3, '0')}`,
            productName: `${product.productName}（OA）`,
            spec: product.spec,
            unit: product.unit,
            gap: 8 + i * 2,
          },
          'pending'
        ),
      ],
    }
  })
}

/** 供应商批次：20 家供应商各 1 个 SKU */
export function buildDemoSupplierBatchOrders(): ShortagePO[] {
  const today = new Date()
  return DEMO_SCROLL_PRODUCTS.map((product, i) => {
    const hotel = DEMO_HOTELS[i]
    const suppliers = getRecommendedSuppliers(product.sku)
    const supplierName = `演示供应商 ${String(i + 1).padStart(2, '0')}`
    return {
      id: `PO-DEMO-SCR-SUP-${String(i + 1).padStart(2, '0')}`,
      customerName: hotel.hotelName,
      deliveryAddress: hotel.deliveryAddress,
      orderDepartment: '餐饮部',
      specialNote: '演示无限滚动 · 待提交采购订单',
      requiredDeliveryDate: addCalendarDays(today, i % 3),
      lines: [
        withLineDefaults({
          id: `L-SCR-SUP-${String(i + 1).padStart(3, '0')}`,
          sku: `JLY-SCR-SUP-${String(i + 1).padStart(3, '0')}`,
          productName: `${product.productName}（批次）`,
          spec: product.spec,
          unit: product.unit,
          gap: 6 + i * 2,
          fulfillmentMethod: 'satisfied',
          procurementOutcome: 'satisfied',
          procurementMode: 'urgent',
          procurementConfirmed: false,
          procurementDraftNo: `DRAFT-SCR-SUP-${String(i + 1).padStart(3, '0')}`,
          recommendedSuppliers: suppliers,
          selectedSupplierId: suppliers[0]?.id ?? `sup-scr-${i + 1}`,
          supplierName,
          procurementPrice: 62,
          amount: 62 * (6 + i * 2),
          oaApprovalStatus: 'none',
          status: 'await_procurement',
        }),
      ],
    }
  })
}

export function buildDemoProcurementScrollOrders(): ShortagePO[] {
  return [
    ...buildDemoProcurementPendingOrders(),
    ...buildDemoProcurementOaOrders(),
    ...buildDemoSupplierBatchOrders(),
  ]
}
