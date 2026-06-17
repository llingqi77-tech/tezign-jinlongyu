import {
  sendFulfillmentPanelAction,
  sendMobileAgentMessage,
  sendProcurementTaskListPanelAction,
  sendSalesHotelPanelAction,
} from '../../../utils/mobileAgentDialogue'
import { SALES_HOTEL_CMD_PREFIX } from '../../../utils/mobileSalesHotelData'
import { FULFILLMENT_CMD_PREFIX } from '../../../utils/mobileFulfillmentData'
import {
  getMobileQuickActions,
  type MobileQuickActionItem,
  type MobileProcurementQuickView,
  type MobileSalesQuickView,
} from '../../../utils/mobileQuickActions'
import { useShortageStore } from '../../../store/shortageStore'
import type { WorkbenchRole } from '../../../types/shortage'

function isQuickActionActive(
  action: MobileQuickActionItem,
  role: WorkbenchRole,
  procurementQuickView: MobileProcurementQuickView,
  salesQuickView: MobileSalesQuickView
): boolean {
  if (role === 'procurement') {
    if (action.kind === 'procurement_sort' && action.procurementSort) {
      return procurementQuickView === action.procurementSort
    }
    if (action.kind === 'open_dashboard') {
      return procurementQuickView === 'fulfillment'
    }
    return false
  }
  if (role === 'sales') {
    if (action.kind === 'sales_hotel_overview') {
      return salesQuickView === 'hotel_overview'
    }
    if (action.kind === 'open_dashboard') {
      return salesQuickView === 'fulfillment'
    }
  }
  return false
}

export function MobileQuickActions() {
  const role = useShortageStore((s) => s.role)
  const procurementQuickView =
    useShortageStore((s) => s.mobileProcurementQuickView) ?? 'delivery'
  const salesQuickView = useShortageStore((s) => s.mobileSalesQuickView) ?? 'hotel_overview'
  const actions = getMobileQuickActions(role)
  if (actions.length === 0) return null

  return (
    <div className="mobile-quick-actions" role="group" aria-label="快捷操作">
      <div className="mobile-quick-actions__scroll">
        {actions.map((action) => {
          const active = isQuickActionActive(
            action,
            role,
            procurementQuickView,
            salesQuickView
          )
          const toggleChip =
            action.kind === 'procurement_sort' ||
            action.kind === 'sales_hotel_overview' ||
            action.kind === 'open_dashboard'
          return (
          <button
            key={action.id}
            type="button"
            className={`mobile-quick-actions__chip${active ? ' mobile-quick-actions__chip--active' : ''}`}
            aria-pressed={toggleChip ? active : undefined}
            onClick={() => {
              const store = useShortageStore.getState()
              if (action.kind === 'procurement_sort' && action.procurementSort) {
                sendProcurementTaskListPanelAction(action.label, action.procurementSort)
              } else if (action.kind === 'sales_hotel_overview') {
                store.setMobileSalesQuickView('hotel_overview')
                sendSalesHotelPanelAction('按酒店数据总览', `${SALES_HOTEL_CMD_PREFIX}open`)
              } else if (action.kind === 'open_task_list') {
                store.openMobileTaskListSheet()
              } else if (action.kind === 'open_dashboard') {
                if (role === 'procurement') {
                  // 采购「缺货品履约数据」打开按品总览整页（非对话内面板）
                  store.openProcurementOverview()
                } else if (role === 'sales') {
                  store.setMobileSalesQuickView('fulfillment')
                  sendFulfillmentPanelAction('缺货品履约数据', `${FULFILLMENT_CMD_PREFIX}open`)
                }
              } else if (action.kind === 'open_kpi_detail' && action.kpiKind) {
                store.openMobileKpiDetailSheet(action.kpiKind)
              } else if (action.message) {
                sendMobileAgentMessage(action.message)
              }
            }}
          >
            {action.label}
          </button>
          )
        })}
      </div>
    </div>
  )
}
