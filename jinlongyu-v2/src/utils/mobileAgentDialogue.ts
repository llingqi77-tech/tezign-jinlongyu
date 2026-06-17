// LLM integration point: replace handleMobileUserMessage with model + tool calls.

import { useShortageStore, type ShortageState } from '../store/shortageStore'
import type { WorkbenchRole } from '../types/shortage'
import { LINE_STATUS_LABEL } from '../constants/shortageLabels'
import {
  findTaskByUserText,
  getMobileHomeKpis,
  getRoleTasksSorted,
  MOBILE_SUGGESTED_QUESTIONS,
  ROLE_LABEL,
} from './mobileAgentSummary'
import { buildQuickActionReply, isRoleQuickActionMessage } from './mobileQuickActions'
import { appendAgentReplies, appendAgentReply, type AgentDialogueReply } from './mobileChatReplies'
import {
  FULFILLMENT_CMD_PREFIX,
  fulfillmentReplyForCommand,
  isFulfillmentCommand,
} from './mobileFulfillmentData'
import {
  SALES_HOTEL_CMD_PREFIX,
  isSalesHotelCommand,
  salesHotelReplyForCommand,
} from './mobileSalesHotelData'
import {
  daysRemaining,
  getShortageLines,
  getMostUrgentProcurementSkuGroups,
  formatMostUrgentProcurementReply,
  groupByHotel,
  isDeliveryToday,
  isFulfillmentDone,
  isSalesTrackedShortageLine,
} from './shortageAggregations'

export type DialogueResult = {
  replies: Array<string | AgentDialogueReply>
}

function answerFaq(text: string, role: WorkbenchRole, store: ShortageState): string | null {
  const { orders } = store
  const kpis = getMobileHomeKpis(orders, role)
  const tasks = getRoleTasksSorted(orders, role)
  const daily = getShortageLines(orders).filter(
    (l) =>
      isDeliveryToday(l.po.requiredDeliveryDate) &&
      (role !== 'sales' || isSalesTrackedShortageLine(l))
  )


  if (/缺货/.test(text)) {
    const scope = role === 'sales' ? '（仅加急、延期）' : ''
    return `今日缺货共 ${kpis.shortageLineCount} 个品${scope}，合计缺口 ${kpis.totalGap}。涉及 ${new Set(daily.map((l) => l.po.customerName)).size} 家客户。`
  }

  if (/已提交|采购.*提交/.test(text)) {
    return `今日采购已提交 ${kpis.procurementSubmittedCount} 个品。点击上方 KPI 可查看各品下的酒店 PO 明细。`
  }

  if (/闭环|签收|完成了多少/.test(text)) {
    return `今日物流已闭环 ${kpis.logisticsClosedCount} 张 PO（该 PO 下所有缺货行均已签收）。点击上方 KPI 可查看明细。`
  }

  if (/待办|还有多少任务/.test(text)) {
    if (tasks.length === 0) return '当前没有待处理项。'
    return `你还有 ${tasks.length} 项待办。${role === 'procurement' ? '请在上方卡片中直接处理。' : ''}`
  }

  if (/紧急|最急/.test(text)) {
    if (role === 'procurement') {
      const urgentGroups = getMostUrgentProcurementSkuGroups(orders)
      return formatMostUrgentProcurementReply(urgentGroups)
    }
    if (tasks.length === 0) return '目前没有待办。'
    const top = tasks.slice(0, 3)
    return `最紧急的待办：\n${top.map((t, i) => `${i + 1}. ${t.title}（交期 ${t.requiredDeliveryDate?.slice(5) ?? '—'}）`).join('\n')}`
  }

  if (/延期|客户.*通知/.test(text) && role === 'sales') {
    const groups = groupByHotel(orders)
    if (groups.length === 0) return '目前没有延期缺货通知。'
    return `共 ${groups.length} 个客户地址有延期缺货：\n${groups
      .slice(0, 3)
      .map((g, i) => `${i + 1}. ${g.hotelName}（${g.deliveryAddress}）· ${g.lines.length} 个品`)
      .join('\n')}`
  }

  if (/香格里拉|调和油/.test(text)) {
    const line = getShortageLines(orders).find(
      (l) => l.po.customerName.includes('香格里拉') && l.productName.includes('调和油')
    )
    if (!line) return '未找到匹配的缺货记录。'
    const days = daysRemaining(line.po.requiredDeliveryDate)
    return `北京香格里拉 · ${line.productName}：缺 ${line.gap}${line.unit}，交期 ${line.po.requiredDeliveryDate.slice(5)}（${days} 天），${isFulfillmentDone(line) ? '已闭环' : LINE_STATUS_LABEL[line.status]}。`
  }

  void ROLE_LABEL
  return null
}

export function sendFulfillmentPanelAction(userLabel: string, command: string) {
  const state = useShortageStore.getState()
  if (state.mobileOnboardingPhase !== 'ready') return

  if (state.role === 'sales') state.setMobileSalesQuickView('fulfillment')
  if (state.role === 'procurement') state.setMobileProcurementQuickView('fulfillment')
  void userLabel
  const reply = fulfillmentReplyForCommand(command, state.orders)
  if (reply) {
    state.replaceMobileChat({
      side: 'agent',
      content: reply.text,
      kind: 'fulfillment_data_panel',
      meta: { fulfillmentPanel: reply.panel },
      stream: false,
    })
    state.bumpMobileChatScrollToTop()
  }
}

function findLatestSalesHotelPanelMessageId(
  messages: ShortageState['mobileChatMessages']
): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.kind === 'sales_hotel_data_panel' && m.side === 'agent') return m.id
  }
  return undefined
}

function isSalesHotelPanelNavigateCommand(command: string): boolean {
  return (
    command === `${SALES_HOTEL_CMD_PREFIX}back` ||
    command.startsWith(`${SALES_HOTEL_CMD_PREFIX}hotel:`)
  )
}

export function sendSalesHotelPanelAction(userLabel: string, command: string) {
  const state = useShortageStore.getState()
  if (state.mobileOnboardingPhase !== 'ready') return

  state.setMobileSalesQuickView('hotel_overview')
  const reply = salesHotelReplyForCommand(command, state.orders)
  if (!reply) return

  if (command === `${SALES_HOTEL_CMD_PREFIX}open`) {
    state.appendMobileChat({ side: 'user', content: userLabel })
    appendAgentReply(state, { text: reply.text, salesHotelPanel: reply.panel }, true)
    return
  }

  if (isSalesHotelPanelNavigateCommand(command)) {
    const panelMessageId = findLatestSalesHotelPanelMessageId(state.mobileChatMessages)
    if (panelMessageId) {
      state.patchSalesHotelPanelMessage(panelMessageId, reply.text, reply.panel)
      return
    }
  }

  state.appendMobileChat({ side: 'user', content: userLabel })
  appendAgentReply(state, { text: reply.text, salesHotelPanel: reply.panel }, true)
}

export function sendProcurementTaskListPanelAction(
  userLabel: string,
  sort: 'delivery' | 'supplier' | 'oa'
) {
  const state = useShortageStore.getState()
  if (state.mobileOnboardingPhase !== 'ready') return

  const view = sort === 'supplier' ? 'delivery' : sort
  state.setMobileProcurementQuickView(view)
  void userLabel
  state.replaceMobileChat({
    side: 'agent',
    content: '',
    kind: 'procurement_task_list_panel',
    meta: { procurementListSort: view },
    stream: false,
  })
  state.bumpMobileChatScrollToTop()
}

export function handleMobileUserMessage(text: string): DialogueResult {
  const trimmed = text.trim()
  if (!trimmed) return { replies: ['请输入内容或点选下方快捷问题。'] }

  const store = useShortageStore.getState()
  const { role } = store

  if (isFulfillmentCommand(trimmed)) {
    const reply = fulfillmentReplyForCommand(trimmed, store.orders)
    if (reply) return { replies: [{ text: reply.text, fulfillmentPanel: reply.panel }] }
  }

  if (isSalesHotelCommand(trimmed)) {
    const reply = salesHotelReplyForCommand(trimmed, store.orders)
    if (reply) return { replies: [{ text: reply.text, salesHotelPanel: reply.panel }] }
  }

  if (/按酒店|酒店数据总览|酒店总览/.test(trimmed) && role === 'sales') {
    const reply = salesHotelReplyForCommand(`${SALES_HOTEL_CMD_PREFIX}open`, store.orders)
    if (reply) return { replies: [{ text: reply.text, salesHotelPanel: reply.panel }] }
  }

  if (/数据大盘|打开大盘|大盘|缺货品履约数据|履约数据总览|履约数据/.test(trimmed)) {
    const reply = fulfillmentReplyForCommand(`${FULFILLMENT_CMD_PREFIX}open`, store.orders)
    if (reply) return { replies: [{ text: reply.text, fulfillmentPanel: reply.panel }] }
    return { replies: ['今日暂无缺货品项。'] }
  }

  if (isRoleQuickActionMessage(trimmed, role)) {
    const quickReply = buildQuickActionReply(trimmed, role, store.orders)
    if (quickReply) return { replies: [quickReply] }
  }

  const faq = answerFaq(trimmed, role, store)
  if (faq) return { replies: [faq] }

  const tasks = getRoleTasksSorted(store.orders, role)
  const hit = findTaskByUserText(tasks, trimmed)
  if (hit) {
    return {
      replies: [
        `「${hit.title}」：${hit.sub}。${role === 'procurement' ? '请在上方对应品项卡片中展开处理。' : '此为只读通知。'}`,
      ],
    }
  }

  const suggestions = MOBILE_SUGGESTED_QUESTIONS[role]
  return {
    replies: [
      `我可以帮你查询缺货处理进度。试试：${suggestions[0]}，或点击「数据大盘」查看详情。`,
    ],
  }
}

export function startMobileTaskInChat() {
  // 任务已在首页卡片中处理，保留空实现兼容旧调用
}

export function startMobileTaskByIndex() {
  // 任务已在首页卡片中处理
}

export function sendMobileAgentMessage(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return

  const state = useShortageStore.getState()
  if (state.mobileOnboardingPhase !== 'ready') return

  state.appendMobileChat({ side: 'user', content: trimmed })
  const result = handleMobileUserMessage(trimmed)
  appendAgentReplies(state, result.replies)
}
