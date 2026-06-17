import { useMemo } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import type { MobileKpiKind } from '../../../types/shortage'
import { sendFulfillmentPanelAction } from '../../../utils/mobileAgentDialogue'
import { FULFILLMENT_CMD_PREFIX } from '../../../utils/mobileFulfillmentData'
import { getMobileHomeKpis } from '../../../utils/mobileAgentSummary'

const KPI_ITEMS: Array<{
  kind: MobileKpiKind
  label: string
  dim: string
  accent?: boolean
  countKey: 'shortageLineCount' | 'procurementSubmittedCount'
}> = [
  { kind: 'shortage', label: '今日缺货品', dim: '品', countKey: 'shortageLineCount' },
  {
    kind: 'submitted',
    label: '采购已提交',
    dim: '品',
    accent: true,
    countKey: 'procurementSubmittedCount',
  },
]

export function MobileHomeKpiStrip() {
  const orders = useShortageStore((s) => s.orders)
  const role = useShortageStore((s) => s.role)
  const openKpiDetail = useShortageStore((s) => s.openMobileKpiDetailSheet)

  const kpis = useMemo(() => getMobileHomeKpis(orders, role), [orders, role])

  return (
    <div className="mobile-kpi-panel" role="group" aria-label="今日缺货处理概览">
      <button
        type="button"
        className="mobile-kpi-panel__dashboard-bar"
        onClick={() =>
          sendFulfillmentPanelAction('缺货品履约数据', `${FULFILLMENT_CMD_PREFIX}open`)
        }
        aria-label="打开缺货品履约数据"
      >
        缺货品履约数据
      </button>
      <div className="mobile-kpi-panel__row">
        <div className="mobile-kpi-strip">
          {KPI_ITEMS.map((item) => (
            <button
              key={item.kind}
              type="button"
              className={`mobile-kpi-strip__item${item.accent ? ' mobile-kpi-strip__item--accent' : ''} mobile-kpi-strip__item--clickable`}
              onClick={() => openKpiDetail(item.kind)}
              aria-label={`${item.label} ${kpis[item.countKey]}，查看明细`}
            >
              <span className="mobile-kpi-strip__value">{kpis[item.countKey]}</span>
              <span className="mobile-kpi-strip__label">{item.label}</span>
              <span className="mobile-kpi-strip__dim">{item.dim}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
