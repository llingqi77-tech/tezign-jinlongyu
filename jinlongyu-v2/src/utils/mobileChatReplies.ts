import type {
  FulfillmentDataPanelState,
  MobileChatAction,
  ProcurementTaskListPanelSort,
  SalesHotelDataPanelState,
} from '../types/shortage'
import type { ShortageState } from '../store/shortageStore'

export type AgentDialogueReply = {
  text: string
  actions?: MobileChatAction[]
  fulfillmentPanel?: FulfillmentDataPanelState
  salesHotelPanel?: SalesHotelDataPanelState
  procurementListSort?: ProcurementTaskListPanelSort
}

export const CHAT_ACTION_SUBMIT_OA: MobileChatAction = {
  id: 'submit_oa',
  label: '提交 OA 审批',
  message: '提交 OA 审批',
}

export const CHAT_ACTION_SUBMIT_PO: MobileChatAction = {
  id: 'submit_po',
  label: '提交采购订单',
  message: '提交采购订单',
}

export function appendAgentReply(
  store: ShortageState,
  reply: string | AgentDialogueReply,
  stream = true
) {
  if (typeof reply === 'string') {
    store.appendMobileChat({ side: 'agent', content: reply, stream })
    return
  }
  const meta =
    reply.fulfillmentPanel != null
      ? { fulfillmentPanel: reply.fulfillmentPanel, actions: reply.actions }
      : reply.salesHotelPanel != null
        ? { salesHotelPanel: reply.salesHotelPanel, actions: reply.actions }
        : reply.procurementListSort != null
          ? { procurementListSort: reply.procurementListSort, actions: reply.actions }
          : reply.actions?.length
            ? { actions: reply.actions }
            : undefined
  const kind = reply.fulfillmentPanel
    ? 'fulfillment_data_panel'
    : reply.salesHotelPanel
      ? 'sales_hotel_data_panel'
      : reply.procurementListSort != null
        ? 'procurement_task_list_panel'
        : undefined
  store.appendMobileChat({
    side: 'agent',
    content: reply.text,
    kind,
    stream,
    meta,
  })
}

export function appendAgentReplies(
  store: ShortageState,
  replies: Array<string | AgentDialogueReply>
) {
  for (const reply of replies) {
    appendAgentReply(store, reply)
  }
}
