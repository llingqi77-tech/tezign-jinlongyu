import type {
  FulfillmentMethod,
  OaApprovalStatus,
  ProcurementMode,
  SalesOutboundType,
  ShortageLineStatus,
} from '../types/shortage'

export const FULFILLMENT_METHOD_LABEL: Record<FulfillmentMethod, string> = {
  pending: '待处理',
  direct_ship: '直发',
  normal_replenishment: '正常补货',
  defer: '延期',
  satisfied: '已补货',
  substitute: '产品平替',
}

export const FULFILLMENT_DONE_METHOD_CHART_COLOR: Record<
  'direct_ship' | 'normal_replenishment' | 'defer' | 'satisfied',
  string
> = {
  direct_ship: '#ff4d00',
  normal_replenishment: '#2563eb',
  defer: '#7c3aed',
  satisfied: '#d97706',
}

export const SALES_OUTBOUND_LABEL: Record<NonNullable<SalesOutboundType>, string> = {
  order_direct: '销售出库订单 OrderDirect',
  backorder: 'Backorder 销售出库订单',
}

export const LINE_STATUS_LABEL: Record<ShortageLineStatus, string> = {
  new: '待处理',
  await_procurement: '待采购缺货处理',
  await_logistics: '待客户签收',
  ready_for_po: '待提交采购订单',
  completed: '已完成',
  cancelled: '已关闭',
}

export const OA_APPROVAL_STATUS_LABEL: Record<OaApprovalStatus, string> = {
  none: '未提交',
  pending: 'OA 审批中',
  approved: 'OA 已通过',
  rejected: 'OA 已驳回',
}

export const PROCUREMENT_MODE_LABEL: Record<ProcurementMode, string> = {
  urgent: '加急采购',
  normal: '常规采购',
  pending: '待定',
}

export const DELIVERY_METHOD_LABEL = {
  warehouse: '送大仓',
  direct: '供应商直送',
} as const

export const PROCUREMENT_FULFILLMENT_CHOICE_LABEL = {
  urgent: '加急',
  defer: '延期',
} as const

export const PROCUREMENT_OUTCOME_LABEL = {
  pending: '待处理',
  satisfied: '满足',
  not_satisfied: '不满足',
} as const

export const TASK_FLOW_TITLES = {
  procurement: '缺货处理',
} as const
