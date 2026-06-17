import type { ShortagePO, ShortagePOLine } from '../types/shortage'
import { addCalendarDays } from '../utils/shortageAggregations'
import { getRecommendedSuppliers } from '../utils/supplierRecommendations'
import { withLineDefaults } from '../utils/shortageLineDefaults'

const TODAY = addCalendarDays(new Date(), 0)
const IN_TWO_DAYS = addCalendarDays(new Date(), 2)
const IN_FOUR_DAYS = addCalendarDays(new Date(), 4)

/** 同一品项一次采购更新共用时间戳，用于销售按品聚合通知 */
const SKU_NOTIFY_AT: Record<string, string> = {
  'JLY-5L-001': '2026-06-02T09:30:00.000Z',
  'JLY-10KG-003': '2026-06-02T10:00:00.000Z',
  'JLY-1L-002': '2026-06-02T10:45:00.000Z',
  'JLY-900ML-004': '2026-06-02T11:20:00.000Z',
}

type LineSeed = Partial<ShortagePOLine> &
  Pick<ShortagePOLine, 'id' | 'sku' | 'productName' | 'gap' | 'unit'>

function notifyAtForSku(sku: string): string {
  return SKU_NOTIFY_AT[sku] ?? '2026-06-02T09:00:00.000Z'
}

function deferLine(seed: LineSeed & { eta?: string }): ShortagePOLine {
  return withLineDefaults({
    spec: '5L/桶',
    quantity: seed.gap + 10,
    unitPrice: 68,
    lineAmount: 0,
    fulfillmentMethod: 'defer',
    procurementOutcome: 'not_satisfied',
    procurementMode: 'normal',
    procurementConfirmed: false,
    procurementDraftNo: `DRAFT-DEF-${seed.id.slice(-4)}`,
    oaApprovalStatus: 'approved',
    oaRequestNo: `OA-DEF-${seed.id.slice(-4)}`,
    status: 'await_logistics',
    eta: seed.eta ?? IN_TWO_DAYS,
    salesProcurementNotifiedAt: seed.salesProcurementNotifiedAt ?? notifyAtForSku(seed.sku),
    ...seed,
  })
}

function pendingLine(seed: LineSeed): ShortagePOLine {
  return withLineDefaults({
    spec: '5L/桶',
    quantity: seed.gap + 10,
    unitPrice: 68,
    lineAmount: 0,
    fulfillmentMethod: 'pending',
    status: 'await_procurement',
    ...seed,
  })
}

function urgentLine(seed: LineSeed & { eta?: string }): ShortagePOLine {
  const suppliers = getRecommendedSuppliers(seed.sku)
  return withLineDefaults({
    spec: '5L/桶',
    quantity: seed.gap + 10,
    unitPrice: 68,
    lineAmount: 0,
    fulfillmentMethod: 'satisfied',
    procurementOutcome: 'satisfied',
    procurementMode: 'urgent',
    recommendedSuppliers: suppliers,
    selectedSupplierId: suppliers[0]?.id ?? '',
    supplierName: suppliers[0]?.name ?? '华东粮油加急仓',
    procurementPrice: 65,
    amount: 65 * seed.gap,
    oaApprovalStatus: 'approved',
    oaRequestNo: `OA-${seed.id.slice(-4)}`,
    deliveryMethod: 'warehouse',
    eta: seed.eta ?? TODAY,
    status: 'await_logistics',
    salesProcurementNotifiedAt: seed.salesProcurementNotifiedAt ?? notifyAtForSku(seed.sku),
    ...seed,
  })
}

/** 销售通知演示：约 20 条加急/延期缺货，8 家客户地址 */
export const MOCK_SALES_NOTICE_ORDERS: ShortagePO[] = [
  {
    id: 'PO-SALES-001',
    customerName: '北京香格里拉饭店',
    deliveryAddress: '北京市朝阳区建国门外大街1号',
    orderDepartment: '餐饮部',
    specialNote: '销售通知 Mock',
    requiredDeliveryDate: TODAY,
    lines: [
      deferLine({
        id: 'L-SN-001',
        sku: 'JLY-5L-001',
        productName: '金龙鱼食用调和油',
        spec: '5L/桶',
        gap: 30,
        unit: '桶',
        eta: IN_FOUR_DAYS,
      }),
      urgentLine({
        id: 'L-SN-002',
        sku: 'JLY-10KG-003',
        productName: '金龙鱼大米',
        spec: '10kg/袋',
        gap: 18,
        unit: '袋',
        eta: TODAY,
      }),
      deferLine({
        id: 'L-SN-003',
        sku: 'JLY-1L-002',
        productName: '金龙鱼葵花籽油',
        spec: '1.8L/瓶',
        gap: 24,
        unit: '瓶',
        eta: IN_TWO_DAYS,
      }),
      pendingLine({
        id: 'L-SN-004',
        sku: 'JLY-900ML-001',
        productName: '金龙鱼花生油',
        spec: '900ml/瓶',
        gap: 12,
        unit: '瓶',
      }),
    ],
  },
  {
    id: 'PO-SALES-002',
    customerName: '北京香格里拉饭店',
    deliveryAddress: '北京市朝阳区建国门外大街1号 · 宴会厅',
    orderDepartment: '宴会厅',
    specialNote: '同一客户不同地址',
    requiredDeliveryDate: TODAY,
    lines: [
      pendingLine({
        id: 'L-SN-P002',
        sku: 'JLY-10KG-003',
        productName: '金龙鱼大米',
        spec: '10kg/袋',
        gap: 14,
        unit: '袋',
      }),
      deferLine({
        id: 'L-SN-D002',
        sku: 'JLY-1L-002',
        productName: '金龙鱼葵花籽油',
        spec: '1.8L/瓶',
        gap: 10,
        unit: '瓶',
      }),
      urgentLine({
        id: 'L-SN-004',
        sku: 'JLY-5L-001',
        productName: '金龙鱼食用调和油',
        gap: 15,
        unit: '桶',
      }),
      urgentLine({
        id: 'L-SN-005',
        sku: 'JLY-900ML-004',
        productName: '金龙鱼压榨花生油',
        spec: '900ml/瓶',
        gap: 40,
        unit: '瓶',
      }),
    ],
  },
  {
    id: 'PO-SALES-003',
    customerName: '上海外滩华尔道夫酒店',
    deliveryAddress: '上海市黄浦区中山东一路2号',
    orderDepartment: '宴会部',
    specialNote: '',
    requiredDeliveryDate: TODAY,
    lines: [
      deferLine({
        id: 'L-SN-006',
        sku: 'JLY-5L-001',
        productName: '金龙鱼食用调和油',
        gap: 22,
        unit: '桶',
      }),
      deferLine({
        id: 'L-SN-007',
        sku: 'JLY-10KG-003',
        productName: '金龙鱼大米',
        spec: '10kg/袋',
        gap: 12,
        unit: '袋',
      }),
      urgentLine({ id: 'L-SN-008', sku: 'JLY-1L-002', productName: '金龙鱼葵花籽油', gap: 16, unit: '瓶' }),
    ],
  },
  {
    id: 'PO-SALES-004',
    customerName: '北京三里屯洲际酒店',
    deliveryAddress: '北京市朝阳区三里屯路1号',
    orderDepartment: '西餐厨房',
    specialNote: '',
    requiredDeliveryDate: TODAY,
    lines: [
      deferLine({
        id: 'L-SN-D004',
        sku: 'JLY-10KG-003',
        productName: '金龙鱼大米',
        spec: '10kg/袋',
        gap: 9,
        unit: '袋',
      }),
      urgentLine({ id: 'L-SN-009', sku: 'JLY-5L-001', productName: '金龙鱼食用调和油', gap: 10, unit: '桶' }),
      urgentLine({
        id: 'L-SN-010',
        sku: 'JLY-900ML-004',
        productName: '金龙鱼压榨花生油',
        spec: '900ml/瓶',
        gap: 28,
        unit: '瓶',
      }),
    ],
  },
  {
    id: 'PO-SALES-005',
    customerName: '广州白天鹅宾馆',
    deliveryAddress: '广州市荔湾区沙面南街1号',
    orderDepartment: '中餐厅',
    specialNote: '',
    requiredDeliveryDate: TODAY,
    lines: [
      pendingLine({
        id: 'L-SN-P005',
        sku: 'JLY-900ML-004',
        productName: '金龙鱼压榨花生油',
        spec: '900ml/瓶',
        gap: 15,
        unit: '瓶',
      }),
      deferLine({ id: 'L-SN-011', sku: 'JLY-10KG-003', productName: '金龙鱼大米', spec: '10kg/袋', gap: 20, unit: '袋' }),
      deferLine({ id: 'L-SN-012', sku: 'JLY-1L-002', productName: '金龙鱼葵花籽油', gap: 14, unit: '瓶' }),
      urgentLine({ id: 'L-SN-013', sku: 'JLY-5L-001', productName: '金龙鱼食用调和油', gap: 8, unit: '桶' }),
    ],
  },
  {
    id: 'PO-SALES-006',
    customerName: '深圳福田香格里拉',
    deliveryAddress: '深圳市福田区益田路4088号',
    orderDepartment: '宴会厅',
    specialNote: '',
    requiredDeliveryDate: TODAY,
    lines: [
      pendingLine({
        id: 'L-SN-P006',
        sku: 'JLY-1L-002',
        productName: '金龙鱼葵花籽油',
        spec: '1.8L/瓶',
        gap: 12,
        unit: '瓶',
      }),
      deferLine({
        id: 'L-SN-D006',
        sku: 'JLY-900ML-001',
        productName: '金龙鱼花生油',
        spec: '900ml/瓶',
        gap: 8,
        unit: '瓶',
      }),
      urgentLine({ id: 'L-SN-014', sku: 'JLY-5L-001', productName: '金龙鱼食用调和油', gap: 32, unit: '桶' }),
      urgentLine({ id: 'L-SN-015', sku: 'JLY-10KG-003', productName: '金龙鱼大米', spec: '10kg/袋', gap: 25, unit: '袋' }),
    ],
  },
  {
    id: 'PO-SALES-007',
    customerName: '成都世纪城天堂洲际',
    deliveryAddress: '成都市高新区世纪城路88号',
    orderDepartment: '全日餐厅',
    specialNote: '',
    requiredDeliveryDate: TODAY,
    lines: [
      deferLine({ id: 'L-SN-016', sku: 'JLY-1L-002', productName: '金龙鱼葵花籽油', gap: 19, unit: '瓶' }),
      deferLine({ id: 'L-SN-017', sku: 'JLY-900ML-004', productName: '金龙鱼压榨花生油', spec: '900ml/瓶', gap: 11, unit: '瓶' }),
      urgentLine({
        id: 'L-SN-U007',
        sku: 'JLY-10KG-003',
        productName: '金龙鱼大米',
        spec: '10kg/袋',
        gap: 16,
        unit: '袋',
      }),
    ],
  },
  {
    id: 'PO-SALES-008',
    customerName: '南京金陵饭店',
    deliveryAddress: '南京市鼓楼区汉中路2号',
    orderDepartment: '淮扬厨房',
    specialNote: '',
    requiredDeliveryDate: TODAY,
    lines: [
      deferLine({ id: 'L-SN-018', sku: 'JLY-5L-001', productName: '金龙鱼食用调和油', gap: 17, unit: '桶' }),
      urgentLine({ id: 'L-SN-019', sku: 'JLY-10KG-003', productName: '金龙鱼大米', spec: '10kg/袋', gap: 21, unit: '袋' }),
      urgentLine({ id: 'L-SN-020', sku: 'JLY-1L-002', productName: '金龙鱼葵花籽油', gap: 9, unit: '瓶' }),
    ],
  },
]
