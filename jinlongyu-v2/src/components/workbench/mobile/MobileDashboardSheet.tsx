import { useMemo } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import { getMobileHomeKpis, getRoleTasksSorted } from '../../../utils/mobileAgentSummary'
import { getOpsCreateSummary } from '../../../utils/shortageAggregations'
import { MobileHomeKpiStrip } from './MobileHomeKpiStrip'

export function MobileDashboardSheet() {
  const open = useShortageStore((s) => s.mobileDashboardOpen)
  const close = useShortageStore((s) => s.closeMobileDashboardSheet)
  const orders = useShortageStore((s) => s.orders)
  const role = useShortageStore((s) => s.role)

  const kpis = useMemo(() => getMobileHomeKpis(orders, role), [orders, role])
  const opsSummary = useMemo(() => getOpsCreateSummary(orders), [orders])
  const tasks = useMemo(() => getRoleTasksSorted(orders, role), [orders, role])

  if (!open) return null

  return (
    <div className="mobile-sheet" role="dialog" aria-modal="true" aria-label="缺货处理数据大盘">
      <button type="button" className="mobile-sheet__backdrop" onClick={close} aria-label="关闭" />
      <div className="mobile-sheet__panel">
        <header className="mobile-sheet__header">
          <h2 className="mobile-sheet__title">缺货处理数据大盘</h2>
          <button type="button" className="mobile-sheet__close" onClick={close} aria-label="关闭">
            ✕
          </button>
        </header>
        <div className="mobile-sheet__body">
          <MobileHomeKpiStrip />
          <dl className="mobile-dashboard-detail">
            <div>
              <dt>今日缺货（品）</dt>
              <dd>{kpis.shortageLineCount} 个</dd>
            </div>
            <div>
              <dt>采购已提交（品）</dt>
              <dd>{kpis.procurementSubmittedCount} 个</dd>
            </div>
            <div>
              <dt>涉及 SKU</dt>
              <dd>{opsSummary.skuCount} 个</dd>
            </div>
            <div>
              <dt>当前角色待办</dt>
              <dd>{tasks.length} 项</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
