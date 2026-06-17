export type WorkbenchRole = 'ops' | 'sales' | 'procurement'

export type PipelineStageKey = 'ops_create' | 'procurement' | 'sales_defer' | 'fulfillment_done'

export type FulfillmentMethod =
  | 'pending'
  | 'direct_ship'
  | 'normal_replenishment'
  | 'defer'
  | 'satisfied'
  | 'substitute'

export type SalesOutboundType = 'order_direct' | 'backorder' | null

export type SignoffStatus = 'pending' | 'signed'

export type ProcurementMode = 'urgent' | 'normal' | 'pending'

export type OaApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected'

export type DeliveryMethod = 'warehouse' | 'direct'

export type ProcurementOutcome = 'pending' | 'satisfied' | 'not_satisfied'

export type ShortageLineStatus =
  | 'new'
  | 'await_procurement'
  | 'await_logistics'
  | 'ready_for_po'
  | 'completed'
  | 'cancelled'

export interface SupplierCandidate {
  id: string
  name: string
}

export interface ShortagePOLine {
  id: string
  sku: string
  productName: string
  spec: string
  quantity: number
  unitPrice: number
  lineAmount: number
  unit: string
  isShortage: boolean
  availableStock: number
  gap: number
  hasInTransitOrder?: boolean
  fulfillmentMethod: FulfillmentMethod
  salesNote: string
  salesOutboundType: SalesOutboundType
  salesOutboundNo: string
  actualFulfillQty: number
  signoffStatus: SignoffStatus
  signoffAt: string
  recommendedSuppliers: SupplierCandidate[]
  selectedSupplierId: string
  supplierName: string
  procurementPrice: number
  lastPurchasePrice: number
  amount: number
  procurementDraftNo: string
  procurementConfirmed: boolean
  oaApprovalStatus: OaApprovalStatus
  oaRequestNo: string
  eta: string
  deliveryMethod: DeliveryMethod | null
  procurementOutcome: ProcurementOutcome
  procurementCategory?: string
  isExpedited: boolean
  expediteFee: number
  procurementMode: ProcurementMode
  status: ShortageLineStatus
  opsPoNumber: string
  /** 供应商直送时的物流单号（选填） */
  logisticsTrackingNo: string
  /** 采购提交后推送给销售的时间（按品+批次聚合通知） */
  salesProcurementNotifiedAt: string
}

export interface ShortagePO {
  id: string
  customerName: string
  deliveryAddress: string
  orderDepartment: string
  specialNote: string
  requiredDeliveryDate: string
  lines: ShortagePOLine[]
}

export interface SkuHotelSubRow {
  lineId: string
  poId: string
  hotelName: string
  deliveryAddress: string
  gap: number
  unit: string
  /** 售价单价（元） */
  unitPrice: number
  requiredDeliveryDate: string
  daysRemaining: number
  fulfillmentMethod: FulfillmentMethod
  supplierName: string
  eta: string
  amount: number
  status: ShortageLineStatus
  procurementConfirmed: boolean
  procurementOutcome: ProcurementOutcome
}

export interface ProcurementSkuGroup {
  sku: string
  productName: string
  spec: string
  unit: string
  /** 售价单价（元），同 SKU 下各 PO 一致时取首条 */
  unitPrice: number
  totalGap: number
  hotelCount: number
  lineCount: number
  earliestRequiredDate: string
  latestRequiredDate: string
  procurementStatus: 'pending' | 'done'
  hotelRows: SkuHotelSubRow[]
}

export interface SalesHotelLineItem {
  lineId: string
  poId: string
  sku: string
  productName: string
  spec: string
  gap: number
  unit: string
  quantity: number
  requiredDeliveryDate: string
  fulfillmentMethod: FulfillmentMethod
  eta: string
  status: ShortageLineStatus
  procurementOutcome: ProcurementOutcome
}

export interface SalesHotelGroup {
  hotelKey: string
  hotelName: string
  deliveryAddress: string
  shortageLineCount: number
  nearestDeliveryDate: string
  poIds: string[]
  lines: SalesHotelLineItem[]
}

export interface SalesSkuUpdateHotelRow {
  lineId: string
  poId: string
  hotelName: string
  deliveryAddress: string
  gap: number
  unit: string
  requiredDeliveryDate: string
  fulfillmentMethod: FulfillmentMethod
  procurementOutcome: ProcurementOutcome
  eta: string
}

/** 采购更新后推送给销售的一条通知（按品 + 批次） */
export interface SalesSkuUpdateBatch {
  batchKey: string
  sku: string
  productName: string
  spec: string
  notifiedAt: string
  hotelCount: number
  lineCount: number
  hotels: SalesSkuUpdateHotelRow[]
}

/** 一次采购更新内按酒店分组（轮播页） */
export interface SalesSkuUpdateHotelGroup {
  hotelKey: string
  hotelName: string
  deliveryAddress: string
  rows: SalesSkuUpdateHotelRow[]
}

export interface ActivityEvent {
  id: string
  timestamp: string
  actor: string
  type: 'sync' | 'sales' | 'procurement' | 'ops' | 'system' | 'logistics'
  content: string
  ref?: { poId?: string; sku?: string; hotel?: string }
}

export interface FulfillmentKpis {
  actualQty: number
  totalGap: number
  signedSkuCount: number
  totalSkuCount: number
}

export interface RoleTaskItem {
  id: string
  lineId: string
  poId: string
  sku: string
  title: string
  sub: string
  stage: PipelineStageKey
  requiredDeliveryDate?: string
  gap?: number
  unit?: string
  stageLabel?: string
  urgencyScore?: number
  customerName?: string
  productName?: string
  deliveryAddress?: string
}

export type MobileAgentPhase = 'idle' | 'awaiting_task_input' | 'confirming'

export type MobileOnboardingPhase = 'role_pick' | 'ready'

export type ProductCategoryKey = 'oil' | 'rice' | 'noodle' | 'dry_spice' | 'other'

export type FulfillmentOverviewStatusKind =
  | 'pending'
  | 'oa_pending'
  | 'oa_rejected'
  | 'defer'
  | 'fulfilling'

export interface FulfillmentProcessedSkuRow {
  sku: string
  title: string
  totalGap: number
  unit: string
  unitPrice: number
  lineCount: number
  earliestDelivery: string
  handlingLabel: string
  oaLabel: string
}

export interface FulfillmentCategoryRow {
  key: ProductCategoryKey
  label: string
  totalSkuCount: number
  pendingSkuCount: number
}

export interface FulfillmentSkuRow {
  sku: string
  title: string
  totalGap: number
  unit: string
  unitPrice: number
  lineCount: number
  earliestDelivery: string
  statusKind: FulfillmentOverviewStatusKind
  statusLabel: string
  pendingPoCount: number
  processedPoCount: number
}

export type FulfillmentDataPanelState =
  | { level: 'categories'; categories: FulfillmentCategoryRow[] }
  | {
      level: 'skus'
      categoryKey: ProductCategoryKey
      categoryLabel: string
      pendingSkus: FulfillmentSkuRow[]
      processedSkus: FulfillmentProcessedSkuRow[]
    }

export interface SalesHotelOverviewRow {
  hotelKey: string
  hotelName: string
  deliveryAddress: string
  lineCount: number
  pendingCount: number
  deferCount: number
  urgentCount: number
  processed: boolean
  nearestDelivery: string
}

export type SalesHotelDataPanelState =
  | {
      level: 'overview'
      skuCount: number
      hotelCount: number
      processedHotelCount: number
      pendingHotelCount: number
      hotels: SalesHotelOverviewRow[]
    }
  | {
      level: 'hotel'
      hotelKey: string
      hotelName: string
      deliveryAddress: string
      pendingLines: SalesHotelLineItem[]
      deferLines: SalesHotelLineItem[]
      urgentLines: SalesHotelLineItem[]
    }

export type ProcurementTaskListPanelSort = 'delivery' | 'supplier' | 'oa'

/** 按供应商聚合、待发起采购订单与 OA 的批次 */
export interface SupplierProcurementBatch {
  supplierName: string
  skuCount: number
  lineCount: number
  totalAmount: number
  productNames: string[]
  skuGroups: ProcurementSkuGroup[]
  lineIds: string[]
}

export type MobileChatMessageKind =
  | 'text'
  | 'welcome_card'
  | 'task_confirm'
  | 'system'
  | 'order_info'
  | 'supplier_options'
  | 'fulfillment_data_panel'
  | 'sales_hotel_data_panel'
  | 'procurement_task_list_panel'

export interface MobileSupplierOption {
  index: number
  name: string
  suggestedPrice: number
  lastPurchasePrice: number
}

export interface MobileOrderInfoDetail {
  hotelName: string
  hotelAddress: string
  productName: string
  spec: string
  gap: number
  unit: string
  unitPrice: number
  totalAmount: number
  deliveryDate: string
  remark: string
}

export interface MobileChatAction {
  id: string
  label: string
  message: string
}

export interface MobileChatMessageMeta {
  kpis?: MobileHomeKpis
  tasks?: RoleTaskItem[]
  orderDetails?: MobileOrderInfoDetail[]
  taskProgress?: string
  taskIndex?: number
  fulfillmentMethodLabel?: string
  fulfillmentFieldLabel?: string
  fulfillmentDetail?: string
  orderStatus?: 'active' | 'completed'
  suppliers?: MobileSupplierOption[]
  actions?: MobileChatAction[]
  fulfillmentPanel?: FulfillmentDataPanelState
  salesHotelPanel?: SalesHotelDataPanelState
  procurementListSort?: ProcurementTaskListPanelSort
}

export interface MobileChatMessage {
  id: string
  side: 'user' | 'agent'
  content: string
  kind?: MobileChatMessageKind
  meta?: MobileChatMessageMeta
  timestamp: string
  stream?: boolean
}

export interface MobileHomeKpis {
  shortageLineCount: number
  procurementSubmittedCount: number
  logisticsClosedCount: number
  totalGap: number
}

export type MobileKpiKind = 'shortage' | 'submitted' | 'logistics'

export interface KpiSkuPoRow {
  lineId: string
  poId: string
  hotelName: string
  deliveryAddress: string
  gap: number
  unit: string
  requiredDeliveryDate: string
  status: ShortageLineStatus
  procurementOutcome: ProcurementOutcome
  fulfillmentMethod: FulfillmentMethod
  supplierName: string
  eta: string
  oaApprovalStatus: OaApprovalStatus
}

export interface KpiSkuGroup {
  sku: string
  productName: string
  spec: string
  unit: string
  lineCount: number
  totalGap: number
  oaApprovalStatus?: OaApprovalStatus
  poRows: KpiSkuPoRow[]
}

export interface KpiClosedPoLine {
  lineId: string
  sku: string
  productName: string
  spec: string
  gap: number
  unit: string
  signoffStatus: SignoffStatus
  signoffAt: string
}

export interface KpiClosedPoGroup {
  poId: string
  customerName: string
  deliveryAddress: string
  requiredDeliveryDate: string
  trackingNo: string
  lines: KpiClosedPoLine[]
}

export type TaskFlowKind = 'procurement'

export type WorkbenchOverlayView = 'ops_chat' | TaskFlowKind

export interface MethodMixItem {
  method: FulfillmentMethod
  label: string
  count: number
  percent: number
}

export interface OpsCreateSummary {
  poSynced: number
  poParsed: number
  shortageLineCount: number
  skuCount: number
  hotelCount: number
  totalGapQty: number
}

export interface FulfillmentDoneSummary {
  hotelCount: number
  orderCount: number
  completedLineCount: number
  methodMix: MethodMixItem[]
}

export interface SubmitProcurementPayload {
  outcome: 'satisfied' | 'not_satisfied'
  supplierName?: string
  price?: number
  eta?: string
  deliveryMethod?: DeliveryMethod
}

export interface SubmitProcurementSkuBatchRow {
  lineId: string
  fulfillmentMode: 'urgent' | 'defer'
  supplierName?: string
  price?: number
  eta?: string
  deliveryMethod?: DeliveryMethod
  logisticsTrackingNo?: string
  remark?: string
  actualFulfillQty: number
}

export interface SubmitProcurementSkuBatchPayload {
  sku: string
  rows: SubmitProcurementSkuBatchRow[]
}

export type ProcurementPoFormState = {
  fulfillmentMode: 'urgent' | 'defer' | null
  supplierName: string
  price: string
  eta: string
  deliveryMethod: DeliveryMethod
  logisticsTrackingNo: string
  remark: string
  actualFulfillQty: string
}

/** 角色选择页「OA 提醒通知」预览场景 */
export type ProcurementOaPreviewOutcome = 'approved' | 'rejected'

/** 销售历史订单：履约方式 */
export type HistoryFulfillmentKind = 'direct' | 'replenish' | 'urgent' | 'defer'

export interface HistoryOrderLine {
  sku: string
  productName: string
  spec: string
  qty: number
  unit: string
  kind: HistoryFulfillmentKind
  signed: boolean
  /** 该 SKU 的收货日期：已签收为实际收货日期，未签收为预计收货日期 YYYY-MM-DD */
  deliveryDate: string
  /** 供应商名称 */
  supplierName: string
}

/** 历史订单主体（运营 / 销售筛选） */
export type HistoryEntity = '丰厨供应链' | '益海嘉里德立安'

/** 销售历史订单（按客户收货日期归档） */
export interface HistoryOrder {
  id: string
  city: string
  /** 订单主体 */
  entity: HistoryEntity
  hotelName: string
  deliveryAddress: string
  /** 收货日期 YYYY-MM-DD */
  deliveryDate: string
  lines: HistoryOrderLine[]
}

export type HistoryOrderStatus = 'completed' | 'partial' | 'deferred'

/** 单个品下关联的一条 PO（一次缺货发生） */
export interface HistorySkuPo {
  /** 关联 PO 号 */
  poNo: string
  /** 所属酒店（按品全局聚合时用于展示，按酒店聚合时可省略） */
  hotelName?: string
  /** 收货日期：已签收为实际收货日期，未签收为预计收货日期 YYYY-MM-DD */
  deliveryDate: string
  qty: number
  kind: HistoryFulfillmentKind
  signed: boolean
  /** 供应商名称 */
  supplierName: string
}

/** 按品（SKU）全局聚合（跨酒店）：采购视角，只关注品的总履约情况 */
export interface HistorySkuGroup {
  sku: string
  productName: string
  spec: string
  unit: string
  /** 总缺货数量 */
  totalQty: number
  /** 已签收数量 */
  signedQty: number
  /** 关联 PO 数 */
  poCount: number
  /** 涉及酒店数 */
  hotelCount: number
  /** 关联的多条 PO（跨酒店，按收货日期倒序） */
  pos: HistorySkuPo[]
}

/** 某酒店下某个品（SKU）：跨多条 PO 聚合 */
export interface HistoryHotelSkuGroup {
  sku: string
  productName: string
  spec: string
  unit: string
  /** 总缺货数量 */
  totalQty: number
  /** 已签收数量 */
  signedQty: number
  /** 关联 PO 数 */
  poCount: number
  /** 关联的多条 PO（按收货日期倒序） */
  pos: HistorySkuPo[]
}

/** 一家酒店在筛选范围内的缺货聚合（按品归并） */
export interface HistoryHotelGroup {
  hotelName: string
  city: string
  /** 总缺货数量 */
  totalQty: number
  /** 已签收数量 */
  signedQty: number
  /** 该酒店下的缺货品列表 */
  skuGroups: HistoryHotelSkuGroup[]
}

export interface HistoryOrderFilter {
  city: string | null
  /** 主体筛选（运营 / 销售视角）；null 为全部主体 */
  entity: HistoryEntity | null
  hotel: string | null
  start: string
  end: string
  /** 品类筛选（采购视角）；null 为全部品类 */
  category: ProductCategoryKey | null
}

export interface HistoryOrderSummary {
  hotelCount: number
  /** 缺货 SKU 数（跨酒店、跨 PO，同一品计 1） */
  skuCount: number
  /** 已履约 SKU 数（该品下全部 PO 订单行均已签收） */
  skuFulfilledCount: number
  /** SKU 维度履约完成率 */
  skuFulfillRate: number
  /** 缺货订单行数（每个酒店每个 PO 里的每个品计 1 行） */
  lineCount: number
  /** 已履约订单行数（该行已签收） */
  lineFulfilledCount: number
  /** 订单行维度履约完成率 */
  lineFulfillRate: number
}
