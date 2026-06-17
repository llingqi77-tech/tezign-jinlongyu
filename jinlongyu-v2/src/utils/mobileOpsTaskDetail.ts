import type {
  MobileOrderInfoDetail,
  PipelineStageKey,
  RoleTaskItem,
  ShortagePO,
  ShortagePOLine,
  WorkbenchRole,
} from '../types/shortage'
import {
  getShortageLines,
  isDeliveryThisWeek,
  isDeliveryToday,
} from './shortageAggregations'
import { ROLE_LABEL } from './mobileAgentSummary'

type ShortageLineWithPo = ShortagePOLine & { po: ShortagePO }

export interface OpsTaskLineDetail {
  lineId: string
  hotelName: string
  hotelAddress: string
  productName: string
  spec: string
  unitPrice: number
  totalAmount: number
  unit: string
  gap: number
  deliveryDate: string
  remark: string
}

const NOTIFY_STAGE_KEYS = new Set<PipelineStageKey>(['procurement', 'sales_defer'])

export function opsStageSupportsNotify(stageKey: PipelineStageKey): boolean {
  return NOTIFY_STAGE_KEYS.has(stageKey)
}

export function getTaskLineDetails(
  orders: ShortagePO[],
  task: RoleTaskItem,
  stageKey: PipelineStageKey,
  refDate = new Date()
): OpsTaskLineDetail[] {
  const allLines = getShortageLines(orders)

  if (stageKey === 'ops_create') {
    const line = allLines.find(
      (item) => item.id === task.lineId && isDeliveryToday(item.po.requiredDeliveryDate, refDate)
    )
    return line ? [toOpsTaskLineDetail(line)] : []
  }

  if (stageKey === 'fulfillment_done') {
    const line = allLines.find(
      (item) =>
        item.id === task.lineId && isDeliveryThisWeek(item.po.requiredDeliveryDate, refDate)
    )
    return line ? [toOpsTaskLineDetail(line)] : []
  }

  const line = allLines.find(
    (item) => item.id === task.lineId && isDeliveryToday(item.po.requiredDeliveryDate, refDate)
  )
  return line ? [toOpsTaskLineDetail(line)] : []
}

export const getOpsTaskLineDetails = getTaskLineDetails

export function isRoleOwnedPipelineStage(
  role: WorkbenchRole,
  stageKey: PipelineStageKey
): boolean {
  if (role === 'procurement') return stageKey === 'procurement'
  if (role === 'sales') return stageKey === 'sales_defer'
  return false
}

export function getOpsNotifyRoleLabel(stageKey: PipelineStageKey): string | null {
  if (stageKey === 'procurement') return ROLE_LABEL.procurement
  if (stageKey === 'sales_defer') return ROLE_LABEL.sales
  return null
}

function toOpsTaskLineDetail(line: ShortageLineWithPo): OpsTaskLineDetail {
  return {
    lineId: line.id,
    hotelName: line.po.customerName,
    hotelAddress: line.po.deliveryAddress,
    productName: line.productName,
    spec: line.spec,
    unitPrice: line.unitPrice,
    totalAmount: line.lineAmount,
    unit: line.unit,
    gap: line.gap,
    deliveryDate: line.po.requiredDeliveryDate,
    remark: line.po.specialNote,
  }
}

export function toMobileOrderInfoDetail(detail: OpsTaskLineDetail): MobileOrderInfoDetail {
  return {
    hotelName: detail.hotelName,
    hotelAddress: detail.hotelAddress,
    productName: detail.productName,
    spec: detail.spec,
    gap: detail.gap,
    unit: detail.unit,
    unitPrice: detail.unitPrice,
    totalAmount: detail.totalAmount,
    deliveryDate: detail.deliveryDate,
    remark: detail.remark,
  }
}
