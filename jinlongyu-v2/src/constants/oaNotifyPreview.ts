import { addCalendarDays } from '../utils/shortageAggregations'

/** 采购 OA 提醒预览专用品项 SKU */
export const OA_NOTIFY_PREVIEW_SKU = 'JLY-OA-NOTIFY'

export const OA_NOTIFY_PREVIEW_REJECT_REASON =
  '交货期与合同条款不一致，请调整预计交货日期后重新提交 OA。'

export function oaNotifyPreviewDeliveryLabel(ref = new Date()): string {
  const yesterday = addCalendarDays(ref, -1)
  return yesterday.slice(5)
}
