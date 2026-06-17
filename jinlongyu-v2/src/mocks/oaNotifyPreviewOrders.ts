import type { OaApprovalStatus, ShortagePO } from '../types/shortage'
import { OA_NOTIFY_PREVIEW_SKU } from '../constants/oaNotifyPreview'
import { addCalendarDays } from '../utils/shortageAggregations'
import { getRecommendedSuppliers } from '../utils/supplierRecommendations'
import { withLineDefaults } from '../utils/shortageLineDefaults'

const now = new Date()
const TODAY = addCalendarDays(now, 0)
const TOMORROW = addCalendarDays(now, 1)

const PREVIEW_SUPPLIER = '中粮贸易华东区'
const PREVIEW_UNIT_PRICE = 60
const PREVIEW_OA_NO = 'OA-20902866'

function previewSubmittedLine(
  seed: { id: string; gap: number },
  oaStatus: OaApprovalStatus
) {
  const suppliers = getRecommendedSuppliers(OA_NOTIFY_PREVIEW_SKU)
  return withLineDefaults({
    id: seed.id,
    sku: OA_NOTIFY_PREVIEW_SKU,
    productName: '金龙鱼食用调和油',
    spec: '5L/桶',
    quantity: seed.gap + 10,
    unitPrice: 68,
    lineAmount: PREVIEW_UNIT_PRICE * seed.gap,
    unit: '桶',
    availableStock: 0,
    gap: seed.gap,
    fulfillmentMethod: 'satisfied',
    procurementOutcome: 'satisfied',
    procurementMode: 'urgent',
    procurementConfirmed: false,
    procurementDraftNo: 'DRAFT-20902',
    recommendedSuppliers: suppliers,
    selectedSupplierId: suppliers[0]?.id ?? '',
    supplierName: PREVIEW_SUPPLIER,
    procurementPrice: PREVIEW_UNIT_PRICE,
    amount: PREVIEW_UNIT_PRICE * seed.gap,
    oaApprovalStatus: oaStatus,
    oaRequestNo: PREVIEW_OA_NO,
    deliveryMethod: 'warehouse',
    eta: TOMORROW,
    actualFulfillQty: seed.gap,
    status: 'await_procurement',
  })
}

/** 采购收到 OA 结果后打开的填写页演示数据 */
export function buildOaNotifyPreviewOrders(oaStatus: OaApprovalStatus): ShortagePO[] {
  return [
    {
      id: 'PO-OA-PREV-001',
      customerName: '北京香格里拉饭店',
      deliveryAddress: '北京市朝阳区建国门外大街1号',
      orderDepartment: '餐饮部-西餐',
      specialNote: 'OA 提醒预览',
      requiredDeliveryDate: TODAY,
      lines: [
        previewSubmittedLine({ id: 'L-OA-PREV-001', gap: 25 }, oaStatus),
      ],
    },
    {
      id: 'PO-OA-PREV-002',
      customerName: '北京国贸大酒店',
      deliveryAddress: '北京市朝阳区建国门外大街1号',
      orderDepartment: '中餐厨房',
      specialNote: 'OA 提醒预览',
      requiredDeliveryDate: TOMORROW,
      lines: [
        previewSubmittedLine({ id: 'L-OA-PREV-002', gap: 5 }, oaStatus),
      ],
    },
  ]
}
