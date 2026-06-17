import { useMemo, useState } from 'react'
import { OA_APPROVAL_STATUS_LABEL, PROCUREMENT_FULFILLMENT_CHOICE_LABEL } from '../../../constants/shortageLabels'
import { useShortageStore } from '../../../store/shortageStore'
import type { KpiClosedPoGroup, KpiSkuGroup, KpiSkuPoRow, MobileKpiKind, WorkbenchRole } from '../../../types/shortage'
import {
  getLogisticsClosedDetailGroups,
  getProcurementSubmittedDetailGroups,
  getTodayShortageDetailGroups,
} from '../../../utils/shortageAggregations'

const KPI_TITLES: Record<MobileKpiKind, string> = {
  shortage: '今日缺货品明细',
  submitted: '采购已提交明细',
  logistics: '物流已闭环明细',
}

function kpiHint(kind: MobileKpiKind, count: number, role: WorkbenchRole): string {
  if (role === 'sales') {
    const scope = '仅含加急、延期缺货'
    if (kind === 'logistics') {
      return `${scope}，按 PO 统计，共 ${count} 张（该 PO 下相关缺货行均已签收）`
    }
    if (kind === 'submitted') {
      return `${scope}，按品统计，共 ${count} 个品；展开查看各酒店 PO 及采购确认信息`
    }
    return `${scope}，按品统计，共 ${count} 个品；展开查看各酒店 PO 明细`
  }
  if (kind === 'logistics') {
    return `按 PO 统计，该 PO 下所有缺货行均已签收，共 ${count} 张`
  }
  if (kind === 'shortage') {
    return `按品统计，共 ${count} 个品；展开查看各酒店 PO 的缺货与交期`
  }
  if (kind === 'submitted') {
    return `按品统计，共 ${count} 个品；同一品整批 OA 审批，展开查看各酒店 PO 采购确认信息`
  }
  return `按品 → 客户订单统计，共 ${count} 行`
}

function rowProcurementChoice(row: KpiSkuPoRow): 'urgent' | 'defer' {
  if (row.procurementOutcome === 'not_satisfied' || row.fulfillmentMethod === 'defer') {
    return 'defer'
  }
  return 'urgent'
}

function groupOaLabel(status: KpiSkuGroup['oaApprovalStatus']): string | null {
  if (!status || status === 'none') return null
  if (status === 'pending') return 'OA 审批中'
  return OA_APPROVAL_STATUS_LABEL[status]
}

function ShortagePoRow({ row }: { row: KpiSkuPoRow }) {
  return (
    <li className="mobile-kpi-detail__row">
      <div className="mobile-kpi-detail__row-main">
        <strong>{row.hotelName}</strong>
        <span className="mobile-kpi-detail__row-muted">{row.deliveryAddress}</span>
        <span className="mobile-kpi-detail__row-gap">
          缺 {row.gap}
          {row.unit}
        </span>
        <span className="mobile-kpi-detail__row-muted">
          交期 {row.requiredDeliveryDate.slice(5)}
        </span>
      </div>
    </li>
  )
}

function SubmittedPoRow({ row }: { row: KpiSkuPoRow }) {
  const choice = rowProcurementChoice(row)
  const isUrgent = choice === 'urgent'

  return (
    <li className="mobile-kpi-detail__row">
      <div className="mobile-kpi-detail__row-main">
        <strong>{row.hotelName}</strong>
        <span className="mobile-kpi-detail__row-muted">{row.deliveryAddress}</span>
        <span className="mobile-kpi-detail__row-gap">
          缺 {row.gap}
          {row.unit}
          <span
            className={`mobile-kpi-detail__channel mobile-kpi-detail__channel--${choice}`}
          >
            {PROCUREMENT_FULFILLMENT_CHOICE_LABEL[choice]}
          </span>
        </span>
        {isUrgent && row.supplierName ? (
          <span className="mobile-kpi-detail__row-field">供应商 {row.supplierName}</span>
        ) : null}
        {isUrgent && row.eta ? (
          <span className="mobile-kpi-detail__row-field">
            预计交货 {row.eta.slice(0, 10)}
          </span>
        ) : null}
      </div>
    </li>
  )
}

function SkuGroupList({
  groups,
  variant,
  role,
}: {
  groups: KpiSkuGroup[]
  variant: 'shortage' | 'submitted'
  role: WorkbenchRole
}) {
  const [expandedSku, setExpandedSku] = useState<string | null>(groups[0]?.sku ?? null)
  const poUnit = role === 'sales' ? '笔订单' : '个酒店 PO'

  if (groups.length === 0) {
    return <p className="mobile-kpi-detail__empty">暂无数据。</p>
  }

  return (
    <div className="mobile-kpi-detail__groups">
      {groups.map((group) => {
        const open = expandedSku === group.sku
        const oaLabel = variant === 'submitted' ? groupOaLabel(group.oaApprovalStatus) : null
        return (
          <article
            key={group.sku}
            className={`mobile-kpi-detail__group${open ? ' mobile-kpi-detail__group--open' : ''}`}
          >
            <button
              type="button"
              className="mobile-kpi-detail__group-head"
              aria-expanded={open}
              onClick={() => setExpandedSku(open ? null : group.sku)}
            >
              <span className="mobile-kpi-detail__chevron" aria-hidden>
                {open ? '▼' : '▶'}
              </span>
              <span className="mobile-kpi-detail__group-body">
                <span className="mobile-kpi-detail__group-title">{group.productName}</span>
                <span className="mobile-kpi-detail__group-sub">
                  {group.spec} · 共缺 {group.totalGap}
                  {group.unit} · {group.lineCount} {poUnit}
                  {oaLabel ? ` · ${oaLabel}` : ''}
                </span>
              </span>
            </button>
            {open ? (
              <ul className="mobile-kpi-detail__rows">
                {group.poRows.map((row) =>
                  variant === 'submitted' ? (
                    <SubmittedPoRow key={row.lineId} row={row} />
                  ) : (
                    <ShortagePoRow key={row.lineId} row={row} />
                  )
                )}
              </ul>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

function ClosedPoGroupList({ groups }: { groups: KpiClosedPoGroup[] }) {
  const [expandedPoId, setExpandedPoId] = useState<string | null>(groups[0]?.poId ?? null)

  if (groups.length === 0) {
    return <p className="mobile-kpi-detail__empty">暂无已闭环订单。</p>
  }

  return (
    <div className="mobile-kpi-detail__groups">
      {groups.map((group) => {
        const open = expandedPoId === group.poId
        return (
          <article
            key={group.poId}
            className={`mobile-kpi-detail__group${open ? ' mobile-kpi-detail__group--open' : ''}`}
          >
            <button
              type="button"
              className="mobile-kpi-detail__group-head"
              aria-expanded={open}
              onClick={() => setExpandedPoId(open ? null : group.poId)}
            >
              <span className="mobile-kpi-detail__chevron" aria-hidden>
                {open ? '▼' : '▶'}
              </span>
              <span className="mobile-kpi-detail__group-body">
                <span className="mobile-kpi-detail__group-title">{group.customerName}</span>
                <span className="mobile-kpi-detail__group-sub">
                  {group.lines.length} 个品
                  {group.trackingNo ? ` · 物流 ${group.trackingNo}` : ''}
                </span>
                <span className="mobile-kpi-detail__group-muted">{group.deliveryAddress}</span>
              </span>
            </button>
            {open ? (
              <ul className="mobile-kpi-detail__rows">
                {group.lines.map((line) => (
                  <li key={line.lineId} className="mobile-kpi-detail__row">
                    <div className="mobile-kpi-detail__row-main">
                      <strong>{line.productName}</strong>
                      <span>
                        {line.spec} · 缺 {line.gap}
                        {line.unit}
                      </span>
                      <span className="mobile-kpi-detail__row-muted">
                        已签收
                        {line.signoffAt ? ` · ${line.signoffAt.slice(5)}` : ''}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

export function MobileKpiDetailSheet() {
  const kind = useShortageStore((s) => s.mobileKpiDetailKind)
  const close = useShortageStore((s) => s.closeMobileKpiDetailSheet)
  const orders = useShortageStore((s) => s.orders)
  const role = useShortageStore((s) => s.role)

  const shortageGroups = useMemo(
    () => getTodayShortageDetailGroups(orders, new Date(), role),
    [orders, role]
  )
  const submittedGroups = useMemo(
    () => getProcurementSubmittedDetailGroups(orders, new Date(), role),
    [orders, role]
  )
  const closedPoGroups = useMemo(
    () => getLogisticsClosedDetailGroups(orders, new Date(), role),
    [orders, role]
  )

  if (!kind) return null

  const activeGroups =
    kind === 'shortage' ? shortageGroups : kind === 'submitted' ? submittedGroups : closedPoGroups
  const count = activeGroups.length

  return (
    <div
      className="mobile-sheet mobile-kpi-detail-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={KPI_TITLES[kind]}
    >
      <button type="button" className="mobile-sheet__backdrop" onClick={close} aria-label="关闭" />
      <div className="mobile-sheet__panel mobile-sheet__panel--tall">
        <header className="mobile-sheet__header">
          <h2 className="mobile-sheet__title">{KPI_TITLES[kind]}</h2>
          <button type="button" className="mobile-sheet__close" onClick={close} aria-label="关闭">
            ✕
          </button>
        </header>
        <div className="mobile-sheet__body">
          <p className="mobile-kpi-detail__hint">{kpiHint(kind, count, role)}</p>
          {kind === 'shortage' ? (
            <SkuGroupList key="shortage" groups={shortageGroups} variant="shortage" role={role} />
          ) : null}
          {kind === 'submitted' ? (
            <SkuGroupList key="submitted" groups={submittedGroups} variant="submitted" role={role} />
          ) : null}
          {kind === 'logistics' ? (
            <ClosedPoGroupList key="logistics" groups={closedPoGroups} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
