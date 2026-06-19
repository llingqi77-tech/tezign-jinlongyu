import { create } from 'zustand'
import { OA_NOTIFY_PREVIEW_SKU } from '../constants/oaNotifyPreview'
import { buildOaNotifyPreviewOrders } from '../mocks/oaNotifyPreviewOrders'
import { MOCK_SHORTAGE_ORDERS } from '../mocks/shortageOrders'
import {
  refreshProcurementDemoDeliveryDates,
  refreshSalesHotelDemoDeliveryDates,
} from '../mocks/refreshProcurementDemoDates'
import type {
  ActivityEvent,
  MobileAgentPhase,
  MobileChatMessage,
  MobileOnboardingPhase,
  MobileRoleViewTarget,
  ProcurementOaPreviewOutcome,
  SalesHotelDataPanelState,
  ShortagePO,
  SubmitProcurementPayload,
  SubmitProcurementSkuBatchPayload,
  WorkbenchRole,
  MobileKpiKind,
} from '../types/shortage'
import { appendAgentReply } from '../utils/mobileChatReplies'
import { getMobileHomeKpis, getRoleTasksSorted } from '../utils/mobileAgentSummary'
import type {
  MobileProcurementQuickView,
  MobileSalesQuickView,
} from '../utils/mobileQuickActions'
import {
  FULFILLMENT_CMD_PREFIX,
  fulfillmentReplyForCommand,
} from '../utils/mobileFulfillmentData'
import { SALES_HOTEL_CMD_PREFIX, salesHotelReplyForCommand } from '../utils/mobileSalesHotelData'
import {
  applyBackendLogisticsRouting,
  ensureLineSuppliers,
  getLinesAwaitingSupplierPoSubmit,
  recomputeLineStatus,
  type ProcurementListSort,
} from '../utils/shortageAggregations'
import { getLastSupplierForPo } from '../utils/supplierRecommendations'

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const nowTime = () =>
  new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })

function cloneOrders(orders: ShortagePO[]): ShortagePO[] {
  return orders.map((po) => ({
    ...po,
    lines: po.lines.map((l) => ({ ...l, recommendedSuppliers: [...l.recommendedSuppliers] })),
  }))
}

export interface ShortageState {
  workbenchOpen: boolean
  role: WorkbenchRole
  orders: ShortagePO[]
  selectedTaskLineId: string | null
  activityEvents: ActivityEvent[]
  generatePoLineId: string | null
  toast: string | null
  signoffTimerId: ReturnType<typeof setInterval> | null
  mobileChatMessages: MobileChatMessage[]
  activeTaskLineId: string | null
  mobileAgentPhase: MobileAgentPhase
  mobileOnboardingPhase: MobileOnboardingPhase
  mobileDashboardOpen: boolean
  mobileKpiDetailKind: MobileKpiKind | null
  mobileTaskListOpen: boolean
  mobileSalesHotelOverviewOpen: boolean
  mobileTaskDisplayIndex: number
  expandedSku: string | null
  procurementActiveSku: string | null
  procurementSkuReadOnly: boolean
  procurementSkuHeaderLabel: string | null
  mobileChatScrollTop: number
  mobileChatRestoreScrollOnNextMount: boolean
  procurementOaPreview: ProcurementOaPreviewOutcome | null
  procurementListSort: ProcurementListSort | null
  mobileSalesQuickView: MobileSalesQuickView | null
  mobileProcurementQuickView: MobileProcurementQuickView | null
  mobileChatScrollToTopNonce: number
  salesHistoryOpen: boolean
  procurementOverviewOpen: boolean
  mobileRoleView: MobileRoleViewTarget

  openWorkbench: () => void
  closeWorkbench: () => void
  returnToRolePick: () => void
  switchMobileRoleView: (target: MobileRoleViewTarget) => void
  setRole: (role: WorkbenchRole) => void
  selectTaskLine: (lineId: string | null) => void
  setExpandedSku: (sku: string | null) => void
  openProcurementSkuPage: (
    sku: string,
    options?: { readOnly?: boolean; headerLabel?: string }
  ) => void
  setMobileChatScrollTop: (top: number) => void
  closeProcurementSkuPage: () => void
  enterProcurementOaNotifyPreview: (outcome: ProcurementOaPreviewOutcome) => void
  loadTodayShortages: () => void
  submitProcurementLine: (lineId: string, payload: SubmitProcurementPayload) => void
  submitProcurementSkuBatch: (payload: SubmitProcurementSkuBatchPayload) => boolean
  submitSupplierProcurementBatch: (supplierName: string) => boolean
  submitOaApproval: (lineId: string) => void
  submitOaApprovalBatch: (lineIds: string[], productName: string, options?: { silent?: boolean }) => void
  receiveOaApproval: (lineId: string, status: 'approved' | 'rejected') => void
  confirmProcurementToErp: (lineId: string) => void
  applySignoff: (lineId: string, qty?: number) => void
  startSignoffMock: () => void
  stopSignoffMock: () => void
  pushActivity: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void
  setToast: (msg: string | null) => void
  resetMobileAgentSession: () => void
  appendMobileChat: (msg: Omit<MobileChatMessage, 'id' | 'timestamp'>) => void
  replaceMobileChat: (msg: Omit<MobileChatMessage, 'id' | 'timestamp'>) => void
  patchSalesHotelPanelMessage: (
    messageId: string,
    content: string,
    panel: SalesHotelDataPanelState
  ) => void
  setActiveTask: (lineId: string | null) => void
  setMobileAgentPhase: (phase: MobileAgentPhase) => void
  setMobileTaskDisplayIndex: (index: number) => void
  setMobileOnboardingPhase: (phase: MobileOnboardingPhase) => void
  finishMobileActivation: () => void
  openMobileDashboardSheet: () => void
  closeMobileDashboardSheet: () => void
  openMobileKpiDetailSheet: (kind: MobileKpiKind) => void
  closeMobileKpiDetailSheet: () => void
  openMobileTaskListSheet: () => void
  closeMobileTaskListSheet: () => void
  openMobileSalesHotelOverview: () => void
  closeMobileSalesHotelOverview: () => void
  setProcurementListSort: (sort: ProcurementListSort | null) => void
  setMobileSalesQuickView: (view: MobileSalesQuickView | null) => void
  setMobileProcurementQuickView: (view: MobileProcurementQuickView) => void
  bumpMobileChatScrollToTop: () => void
  openSalesHistory: () => void
  closeSalesHistory: () => void
  openProcurementOverview: () => void
  closeProcurementOverview: () => void
}

function patchLine(
  orders: ShortagePO[],
  lineId: string,
  patch: Partial<ShortagePO['lines'][0]>
): ShortagePO[] {
  return orders.map((po) => ({
    ...po,
    lines: po.lines.map((line) => {
      if (line.id !== lineId) return line
      const merged = ensureLineSuppliers({ ...line, ...patch })
      return recomputeLineStatus(merged)
    }),
  }))
}

function findLine(orders: ShortagePO[], lineId: string) {
  for (const po of orders) {
    const line = po.lines.find((l) => l.id === lineId)
    if (line) return { line, po }
  }
  return null
}

export const useShortageStore = create<ShortageState>((set, get) => ({
  workbenchOpen: false,
  role: 'ops',
  orders: [],
  selectedTaskLineId: null,
  activityEvents: [],
  generatePoLineId: null,
  toast: null,
  signoffTimerId: null,
  mobileChatMessages: [],
  activeTaskLineId: null,
  mobileAgentPhase: 'idle',
  mobileOnboardingPhase: 'role_pick',
  mobileDashboardOpen: false,
  mobileKpiDetailKind: null,
  mobileTaskListOpen: false,
  mobileSalesHotelOverviewOpen: false,
  mobileTaskDisplayIndex: 0,
  expandedSku: null,
  procurementActiveSku: null,
  procurementSkuReadOnly: false,
  procurementSkuHeaderLabel: null,
  procurementOaPreview: null,
  procurementListSort: null,
  mobileSalesQuickView: null,
  mobileProcurementQuickView: null,
  mobileChatScrollTop: 0,
  mobileChatRestoreScrollOnNextMount: false,
  mobileChatScrollToTopNonce: 0,
  salesHistoryOpen: false,
  procurementOverviewOpen: false,
  mobileRoleView: 'procurement',

  openWorkbench: () => {
    const { signoffTimerId } = get()
    get().loadTodayShortages()
    if (!signoffTimerId) get().startSignoffMock()
    set({
      workbenchOpen: true,
      selectedTaskLineId: null,
      mobileChatMessages: [],
      activeTaskLineId: null,
      mobileAgentPhase: 'idle',
      mobileOnboardingPhase: 'ready',
      mobileDashboardOpen: false,
      mobileKpiDetailKind: null,
      mobileTaskListOpen: false,
      mobileSalesHotelOverviewOpen: false,
      mobileTaskDisplayIndex: 0,
      expandedSku: null,
      procurementActiveSku: null,
      procurementSkuReadOnly: false,
      procurementSkuHeaderLabel: null,
      procurementOaPreview: null,
      procurementListSort: null,
      mobileSalesQuickView: null,
      mobileProcurementQuickView: null,
      mobileChatScrollTop: 0,
      mobileChatRestoreScrollOnNextMount: false,
      salesHistoryOpen: false,
      procurementOverviewOpen: false,
    })
    get().switchMobileRoleView('procurement')
  },

  switchMobileRoleView: (target) => {
    const baseReset = {
      mobileOnboardingPhase: 'ready' as const,
      mobileRoleView: target,
      salesHistoryOpen: false,
      procurementOverviewOpen: false,
      selectedTaskLineId: null,
      mobileDashboardOpen: false,
      mobileKpiDetailKind: null,
      mobileTaskListOpen: false,
      mobileSalesHotelOverviewOpen: false,
      mobileChatScrollTop: 0,
      mobileChatRestoreScrollOnNextMount: false,
      activeTaskLineId: null,
      mobileAgentPhase: 'idle' as const,
      mobileTaskDisplayIndex: 0,
      expandedSku: null,
    }

    if (target === 'oa_approved') {
      get().enterProcurementOaNotifyPreview('approved')
      return
    }
    if (target === 'oa_rejected') {
      get().enterProcurementOaNotifyPreview('rejected')
      return
    }

    get().loadTodayShortages()

    if (target === 'ops') {
      set({
        ...baseReset,
        role: 'ops',
        mobileChatMessages: [],
        procurementActiveSku: null,
        procurementSkuReadOnly: false,
        procurementSkuHeaderLabel: null,
        procurementOaPreview: null,
        procurementListSort: null,
        mobileSalesQuickView: null,
        mobileProcurementQuickView: null,
      })
      return
    }

    set({
      ...baseReset,
      role: target,
      mobileChatMessages: [],
      procurementActiveSku: null,
      procurementSkuReadOnly: false,
      procurementSkuHeaderLabel: null,
      procurementOaPreview: null,
      procurementListSort: null,
      mobileSalesQuickView: null,
      mobileProcurementQuickView: null,
    })
    get().finishMobileActivation()
  },

  returnToRolePick: () => {
    get().switchMobileRoleView('procurement')
  },

  closeWorkbench: () => {
    get().stopSignoffMock()
    set({
      workbenchOpen: false,
      generatePoLineId: null,
      selectedTaskLineId: null,
      mobileOnboardingPhase: 'role_pick',
      mobileDashboardOpen: false,
      mobileKpiDetailKind: null,
      mobileTaskListOpen: false,
      mobileSalesHotelOverviewOpen: false,
      mobileChatMessages: [],
      activeTaskLineId: null,
      mobileAgentPhase: 'idle',
      mobileTaskDisplayIndex: 0,
      expandedSku: null,
      procurementActiveSku: null,
      procurementSkuReadOnly: false,
      procurementSkuHeaderLabel: null,
      procurementOaPreview: null,
      procurementListSort: null,
      mobileSalesQuickView: null,
      mobileProcurementQuickView: null,
      mobileChatScrollTop: 0,
      mobileChatRestoreScrollOnNextMount: false,
    })
  },

  setRole: (role) => {
    set({
      role,
      selectedTaskLineId: null,
      mobileChatMessages: [],
      activeTaskLineId: null,
      mobileAgentPhase: 'idle',
      mobileTaskDisplayIndex: 0,
      expandedSku: null,
      procurementActiveSku: null,
      procurementSkuReadOnly: false,
      procurementSkuHeaderLabel: null,
      procurementOaPreview: null,
      procurementListSort: null,
      mobileSalesQuickView: null,
      mobileProcurementQuickView: null,
      mobileChatScrollTop: 0,
      mobileChatRestoreScrollOnNextMount: false,
      salesHistoryOpen: false,
      procurementOverviewOpen: false,
    })
  },

  selectTaskLine: (lineId) => set({ selectedTaskLineId: lineId }),
  setExpandedSku: (sku) => set({ expandedSku: sku }),

  openProcurementSkuPage: (sku, options) => {
    const threadEl = document.querySelector('.platform-mobile .mobile-chat-thread')
    const scrollTop =
      threadEl instanceof HTMLElement ? threadEl.scrollTop : get().mobileChatScrollTop
    set({
      procurementActiveSku: sku,
      procurementSkuReadOnly: options?.readOnly ?? false,
      procurementSkuHeaderLabel: options?.headerLabel ?? null,
      expandedSku: null,
      mobileChatScrollTop: scrollTop,
      mobileChatRestoreScrollOnNextMount: true,
    })
  },

  closeProcurementSkuPage: () => {
    const wasPreview = get().procurementOaPreview != null
    if (wasPreview) {
      get().switchMobileRoleView('procurement')
      return
    }
    set({
      procurementActiveSku: null,
      procurementSkuReadOnly: false,
      procurementSkuHeaderLabel: null,
      procurementOaPreview: null,
      mobileChatRestoreScrollOnNextMount: true,
    })
  },

  setMobileChatScrollTop: (top) => set({ mobileChatScrollTop: top }),

  enterProcurementOaNotifyPreview: (outcome) => {
    const oaStatus = outcome === 'approved' ? 'approved' : 'rejected'
    const orders = applyBackendLogisticsRouting(cloneOrders(buildOaNotifyPreviewOrders(oaStatus)))
    set({
      orders,
      role: 'procurement',
      selectedTaskLineId: null,
      mobileChatMessages: [],
      activeTaskLineId: null,
      mobileAgentPhase: 'idle',
      mobileOnboardingPhase: 'ready',
      mobileRoleView: outcome === 'approved' ? 'oa_approved' : 'oa_rejected',
      salesHistoryOpen: false,
      procurementOverviewOpen: false,
      mobileDashboardOpen: false,
      mobileKpiDetailKind: null,
      mobileTaskListOpen: false,
      mobileSalesHotelOverviewOpen: false,
      mobileTaskDisplayIndex: 0,
      expandedSku: null,
      procurementActiveSku: OA_NOTIFY_PREVIEW_SKU,
      procurementOaPreview: outcome,
      procurementListSort: null,
      mobileSalesQuickView: null,
      mobileProcurementQuickView: null,
    })
  },

  loadTodayShortages: () => {
    const orders = refreshSalesHotelDemoDeliveryDates(
      refreshProcurementDemoDeliveryDates(
        applyBackendLogisticsRouting(cloneOrders(MOCK_SHORTAGE_ORDERS))
      )
    )
    set({
      orders,
      activityEvents: [
        {
          id: uid(),
          timestamp: nowTime(),
          actor: '系统',
          type: 'sync',
          content: `今日缺货已同步：${orders.length} 张待转单；直发/正常补货已自动算路，采购待办已推送`,
        },
      ],
    })
  },

  submitProcurementLine: (lineId, payload) => {
    const found = findLine(get().orders, lineId)
    if (!found) return
    const { line } = found

    if (payload.outcome === 'not_satisfied') {
      const orders = patchLine(get().orders, lineId, {
        procurementOutcome: 'not_satisfied',
        fulfillmentMethod: 'defer',
        supplierName: '',
        selectedSupplierId: '',
        amount: 0,
        procurementPrice: 0,
        eta: '',
        deliveryMethod: null,
        oaApprovalStatus: 'none',
        oaRequestNo: '',
        procurementDraftNo: '',
        procurementConfirmed: false,
        salesOutboundType: 'backorder',
        salesOutboundNo: line.salesOutboundNo || `SO-B-${Date.now().toString().slice(-8)}`,
        salesProcurementNotifiedAt: new Date().toISOString(),
      })
      set({ orders })
      get().pushActivity({
        actor: '采购',
        type: 'procurement',
        content: `${line.productName} 无法满足，已通知销售跟进延期`,
        ref: { sku: line.sku },
      })
      get().setToast('已标记为不满足，销售将收到延期通知')
      return
    }

    const supplierName = payload.supplierName?.trim() || line.supplierName
    const price = payload.price ?? line.procurementPrice
    const amount = Math.round(price * line.gap)
    const eta = payload.eta ?? ''
    const deliveryMethod = payload.deliveryMethod ?? 'warehouse'

    if (!supplierName || !eta) {
      get().setToast('请填写供应商与交期')
      return
    }

    const primary = ensureLineSuppliers(line).recommendedSuppliers[0]
    const orders = patchLine(get().orders, lineId, {
      procurementOutcome: 'satisfied',
      fulfillmentMethod: 'satisfied',
      supplierName,
      selectedSupplierId: primary?.id ?? 'custom',
      procurementPrice: price,
      amount,
      eta,
      deliveryMethod,
      procurementMode: 'urgent',
      salesProcurementNotifiedAt: new Date().toISOString(),
    })
    set({ orders })
    get().pushActivity({
      actor: '采购',
      type: 'procurement',
      content: `${line.productName} 缺货处理已提交：${supplierName} · ¥${amount.toLocaleString()} · ${eta}`,
    })
    get().setToast('缺货处理已提交，推送 OA 审批')
    get().submitOaApproval(lineId)
  },

  submitProcurementSkuBatch: (payload) => {
    const { sku, rows } = payload
    if (rows.length === 0) {
      get().setToast('没有可提交的 PO')
      return false
    }

    for (const row of rows) {
      if (row.fulfillmentMode === 'urgent' || row.fulfillmentMode === 'defer') {
        if (!row.supplierName?.trim() || !row.eta || row.price == null || row.price <= 0) {
          get().setToast('请填写供应商、采购价格与预计交货日期')
          return false
        }
      }
    }

    let orders = get().orders
    let productName = ''
    const notifiedAt = new Date().toISOString()

    for (const row of rows) {
      const found = findLine(orders, row.lineId)
      if (!found || found.line.sku !== sku) continue
      const { line } = found
      productName = line.productName

      if (row.fulfillmentMode === 'defer') {
        const supplier = getLastSupplierForPo(sku, found.po.id)
        const price = row.price!
        orders = patchLine(orders, row.lineId, {
          procurementOutcome: 'not_satisfied',
          fulfillmentMethod: 'defer',
          procurementMode: 'normal',
          actualFulfillQty: row.actualFulfillQty,
          supplierName: row.supplierName!.trim(),
          selectedSupplierId: supplier.id,
          salesNote: row.remark?.trim() ?? '',
          amount: Math.round(price * row.actualFulfillQty),
          procurementPrice: price,
          eta: row.eta!,
          deliveryMethod: row.deliveryMethod ?? 'warehouse',
          logisticsTrackingNo:
            row.deliveryMethod === 'direct' ? (row.logisticsTrackingNo?.trim() ?? '') : '',
          oaApprovalStatus: 'none',
          oaRequestNo: '',
          procurementDraftNo: '',
          procurementConfirmed: false,
          salesOutboundType: 'backorder',
          salesOutboundNo: line.salesOutboundNo || `SO-B-${Date.now().toString().slice(-8)}`,
          salesProcurementNotifiedAt: notifiedAt,
        })
        continue
      }

      const supplier = getLastSupplierForPo(sku, found.po.id)
      orders = patchLine(orders, row.lineId, {
        procurementOutcome: 'satisfied',
        fulfillmentMethod: 'satisfied',
        procurementMode: 'urgent',
        actualFulfillQty: row.actualFulfillQty,
        supplierName: row.supplierName!.trim(),
        selectedSupplierId: supplier.id,
        salesNote: row.remark?.trim() ?? '',
        procurementPrice: row.price!,
        amount: Math.round(row.price! * row.actualFulfillQty),
        eta: row.eta!,
        deliveryMethod: row.deliveryMethod ?? 'warehouse',
        logisticsTrackingNo:
          row.deliveryMethod === 'direct' ? (row.logisticsTrackingNo?.trim() ?? '') : '',
        oaApprovalStatus: 'none',
        oaRequestNo: '',
        procurementDraftNo: '',
        procurementConfirmed: false,
        salesProcurementNotifiedAt: notifiedAt,
      })
    }

    set({ orders })

    get().pushActivity({
      actor: '采购',
      type: 'procurement',
      content: `${productName} · 缺货处理信息已提交（${rows.length} 个酒店 PO），待按供应商发起采购`,
      ref: { sku },
    })
    get().setToast('缺货处理信息已提交，请右滑至「提交采购订单」继续')

    return true
  },

  submitSupplierProcurementBatch: (supplierName) => {
    const trimmed = supplierName.trim()
    const awaiting = getLinesAwaitingSupplierPoSubmit(get().orders).filter(
      (line) => line.supplierName?.trim() === trimmed
    )
    if (awaiting.length === 0) {
      get().setToast('该供应商暂无待提交的缺货处理')
      return false
    }

    const urgentIds: string[] = []
    const deferIds: string[] = []
    for (const line of awaiting) {
      if (line.procurementOutcome === 'satisfied') urgentIds.push(line.id)
      else deferIds.push(line.id)
    }

    if (urgentIds.length > 0) {
      get().submitOaApprovalBatch(urgentIds, trimmed, { silent: false })
    }

    for (const lineId of deferIds) {
      get().confirmProcurementToErp(lineId)
    }

    get().pushActivity({
      actor: '采购',
      type: 'procurement',
      content: `${trimmed}：已提交采购订单与 OA（${awaiting.length} 个酒店 PO · ${new Set(awaiting.map((l) => l.sku)).size} 个品）`,
    })

    return true
  },

  submitOaApproval: (lineId) => {
    get().submitOaApprovalBatch([lineId], findLine(get().orders, lineId)?.line.productName ?? '')
  },

  submitOaApprovalBatch: (lineIds, productName, options?: { silent?: boolean }) => {
    const validIds = lineIds.filter((id) => {
      const line = findLine(get().orders, id)?.line
      return line?.supplierName && line.amount > 0
    })
    if (validIds.length === 0) {
      get().setToast('请先完成缺货处理表单')
      return
    }

    const oaRequestNo = `OA-${Date.now().toString().slice(-8)}`
    let orders = get().orders
    for (const lineId of validIds) {
      orders = patchLine(orders, lineId, {
        oaApprovalStatus: 'pending',
        oaRequestNo,
        procurementDraftNo: '',
        procurementConfirmed: false,
      })
    }
    set({ orders })
    get().pushActivity({
      actor: '采购',
      type: 'procurement',
      content: `${productName} 已提交 OA 审批 ${oaRequestNo}（涉及 ${validIds.length} 个酒店 PO）`,
    })
    if (!options?.silent) {
      get().setToast(`已整批提交 OA 审批（涉及 ${validIds.length} 个酒店 PO）`)
    }

    window.setTimeout(() => {
      for (const lineId of validIds) {
        const current = findLine(get().orders, lineId)?.line
        if (current?.oaApprovalStatus === 'pending') {
          get().receiveOaApproval(lineId, 'approved')
        }
      }
    }, 2800)
  },

  receiveOaApproval: (lineId, status) => {
    const line = findLine(get().orders, lineId)?.line
    if (!line || line.oaApprovalStatus !== 'pending') return

    if (status === 'approved') {
      const draftNo = `DRAFT-${Date.now().toString().slice(-5)}`
      const orders = patchLine(get().orders, lineId, {
        oaApprovalStatus: 'approved',
        procurementDraftNo: draftNo,
      })
      set({ orders })
      get().pushActivity({
        actor: 'OA系统',
        type: 'procurement',
        content: `审批单 ${line.oaRequestNo} 已通过`,
      })
      get().setToast('OA 已通过，正在生成采购订单…')
      window.setTimeout(() => get().confirmProcurementToErp(lineId), 600)
      return
    }

    const orders = patchLine(get().orders, lineId, {
      oaApprovalStatus: 'rejected',
      procurementDraftNo: '',
    })
    set({ orders })
    get().pushActivity({
      actor: 'OA系统',
      type: 'procurement',
      content: `审批单 ${line.oaRequestNo} 已驳回，请修改后重新提交`,
    })
    get().setToast('OA 已驳回，请修改后重新提交')
  },

  confirmProcurementToErp: (lineId) => {
    const poNumber = `PU-${Date.now().toString().slice(-6)}`
    const orders = patchLine(get().orders, lineId, {
      procurementConfirmed: true,
      opsPoNumber: poNumber,
    })
    set({ orders })
    get().pushActivity({
      actor: '系统',
      type: 'ops',
      content: `采购订单 ${poNumber} 已写入金龙鱼采购系统`,
    })
    get().setToast(`采购订单 ${poNumber} 已确认下发`)
  },

  applySignoff: (lineId, qty) => {
    const line = findLine(get().orders, lineId)?.line
    if (!line || !line.isShortage) return
    const signQty = qty ?? line.gap
    const orders = patchLine(get().orders, lineId, {
      actualFulfillQty: signQty,
      signoffStatus: signQty >= line.gap ? 'signed' : 'pending',
      signoffAt: new Date().toISOString().slice(0, 10),
    })
    set({ orders })
    get().pushActivity({
      actor: '物流',
      type: 'logistics',
      content: `客户签收 ${signQty}${line.unit}`,
    })
  },

  startSignoffMock: () => {
    if (get().signoffTimerId) return
    const id = setInterval(() => {
      const pending = get()
        .orders.flatMap((o) => o.lines.map((l) => ({ ...l, po: o })))
        .find(
          (l) =>
            l.isShortage &&
            l.signoffStatus !== 'signed' &&
            ['await_logistics'].includes(l.status)
        )
      if (pending) get().applySignoff(pending.id, pending.gap)
    }, 12000)
    set({ signoffTimerId: id })
  },

  stopSignoffMock: () => {
    const id = get().signoffTimerId
    if (id) clearInterval(id)
    set({ signoffTimerId: null })
  },

  pushActivity: (event) =>
    set((s) => ({
      activityEvents: [...s.activityEvents, { ...event, id: uid(), timestamp: nowTime() }],
    })),

  setToast: (msg) => {
    set({ toast: msg })
    if (msg) setTimeout(() => set({ toast: null }), 2800)
  },

  resetMobileAgentSession: () =>
    set({
      mobileChatMessages: [],
      activeTaskLineId: null,
      mobileAgentPhase: 'idle',
      mobileTaskDisplayIndex: 0,
    }),

  appendMobileChat: (msg) =>
    set((s) => ({
      mobileChatMessages: [
        ...s.mobileChatMessages,
        { ...msg, id: uid(), timestamp: nowTime() },
      ],
    })),

  replaceMobileChat: (msg) =>
    set({
      mobileChatMessages: [{ ...msg, id: uid(), timestamp: nowTime() }],
    }),

  patchSalesHotelPanelMessage: (messageId, content, panel) =>
    set((s) => ({
      mobileChatMessages: s.mobileChatMessages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              content,
              kind: 'sales_hotel_data_panel' as const,
              meta: { ...m.meta, salesHotelPanel: panel },
            }
          : m
      ),
    })),

  setActiveTask: (lineId) => set({ activeTaskLineId: lineId }),
  setMobileAgentPhase: (phase) => set({ mobileAgentPhase: phase }),
  setMobileTaskDisplayIndex: (index) => set({ mobileTaskDisplayIndex: index }),

  setMobileOnboardingPhase: (phase) => set({ mobileOnboardingPhase: phase }),

  finishMobileActivation: () => {
    const { orders, role } = get()
    const kpis = getMobileHomeKpis(orders, role)
    const tasks = getRoleTasksSorted(orders, role)
    set({
      mobileOnboardingPhase: 'ready',
      mobileChatMessages: [],
      activeTaskLineId: null,
      mobileAgentPhase: 'idle',
      mobileTaskDisplayIndex: 0,
    })
    if (role === 'sales') {
      set({ mobileSalesQuickView: 'hotel_overview' })
      const reply = salesHotelReplyForCommand(`${SALES_HOTEL_CMD_PREFIX}open`, get().orders)
      if (reply) {
        appendAgentReply(get(), { text: reply.text, salesHotelPanel: reply.panel }, true)
      }
      return
    }
    if (role === 'ops') {
      const reply = fulfillmentReplyForCommand(`${FULFILLMENT_CMD_PREFIX}open`, get().orders)
      if (reply) {
        appendAgentReply(get(), { text: reply.text, fulfillmentPanel: reply.panel }, true)
      }
      return
    }
    set({ mobileProcurementQuickView: 'delivery', procurementListSort: 'delivery' })
    get().appendMobileChat({
      side: 'agent',
      content: '',
      kind: 'welcome_card',
      meta: { kpis, tasks },
      stream: true,
    })
  },

  openMobileDashboardSheet: () => set({ mobileDashboardOpen: true, mobileKpiDetailKind: null }),
  closeMobileDashboardSheet: () => set({ mobileDashboardOpen: false }),
  openMobileKpiDetailSheet: (kind) =>
    set({ mobileKpiDetailKind: kind, mobileDashboardOpen: false }),
  closeMobileKpiDetailSheet: () => set({ mobileKpiDetailKind: null }),
  openMobileTaskListSheet: () => set({ mobileTaskListOpen: true }),
  closeMobileTaskListSheet: () => set({ mobileTaskListOpen: false }),
  openMobileSalesHotelOverview: () =>
    set({ mobileSalesHotelOverviewOpen: true, mobileKpiDetailKind: null }),
  closeMobileSalesHotelOverview: () => set({ mobileSalesHotelOverviewOpen: false }),
  setProcurementListSort: (sort) => set({ procurementListSort: sort }),
  setMobileSalesQuickView: (view) => set({ mobileSalesQuickView: view }),
  setMobileProcurementQuickView: (view) =>
    set(
      view === 'fulfillment'
        ? { mobileProcurementQuickView: view }
        : { mobileProcurementQuickView: view, procurementListSort: view }
    ),
  bumpMobileChatScrollToTop: () =>
    set((s) => ({ mobileChatScrollToTopNonce: s.mobileChatScrollToTopNonce + 1 })),
  openSalesHistory: () => set({ salesHistoryOpen: true }),
  closeSalesHistory: () => set({ salesHistoryOpen: false }),
  openProcurementOverview: () =>
    set({ procurementOverviewOpen: true, mobileProcurementQuickView: 'fulfillment' }),
  closeProcurementOverview: () => set({ procurementOverviewOpen: false }),
}))
