import { useCallback, useMemo, useRef, useState } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import type { SalesHotelGroup, SalesHotelLineItem } from '../../../types/shortage'
import { groupByHotel } from '../../../utils/shortageAggregations'
import { salesLineBadge, salesLineDetail } from '../../../utils/salesNoticeDisplay'

function isLineDefer(line: SalesHotelLineItem): boolean {
  return line.procurementOutcome === 'not_satisfied' || line.fulfillmentMethod === 'defer'
}

function isLineUrgent(line: SalesHotelLineItem): boolean {
  return line.fulfillmentMethod === 'satisfied' || line.procurementOutcome === 'satisfied'
}

function hotelChannelSummary(group: SalesHotelGroup): string {
  let deferCount = 0
  let urgentCount = 0
  let pendingCount = 0
  for (const line of group.lines) {
    if (isLineDefer(line)) deferCount += 1
    else if (isLineUrgent(line)) urgentCount += 1
    else pendingCount += 1
  }
  const parts: string[] = [`${group.lines.length} 个品`]
  if (pendingCount > 0) parts.push(`${pendingCount} 待处理`)
  if (deferCount > 0) parts.push(`${deferCount} 延期`)
  if (urgentCount > 0) parts.push(`${urgentCount} 加急`)
  return parts.join(' · ')
}

function SalesHotelCard({ group }: { group: SalesHotelGroup }) {
  return (
    <article className="sales-defer-card sales-defer-card--open">
      <header className="sales-defer-card__head">
        <span className="sales-defer-card__head-text">
          <span className="sales-defer-card__title">{group.hotelName}</span>
          <span className="sales-defer-card__addr">{group.deliveryAddress}</span>
          <span className="sales-defer-card__summary">{hotelChannelSummary(group)}</span>
        </span>
      </header>
      <ul className="sales-defer-card__lines">
        {group.lines.map((line) => {
          const badge = salesLineBadge(line)
          return (
            <li key={line.lineId}>
              <div className="sales-defer-card__line-head">
                <strong>{line.productName}</strong>
                <span className={badge.className}>{badge.label}</span>
              </div>
              <span className="sales-defer-card__line-detail">
                缺 {line.gap}
                {line.unit} · {salesLineDetail(line)}
              </span>
            </li>
          )
        })}
      </ul>
    </article>
  )
}

/** 按酒店聚合的全量缺货数据（含待采购处理） */
export function MobileSalesHotelOverview() {
  const orders = useShortageStore((s) => s.orders)
  const groups = useMemo(() => groupByHotel(orders), [orders])
  const totalLines = useMemo(() => groups.reduce((n, g) => n + g.lines.length, 0), [groups])

  const trackRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const syncActiveIndex = useCallback(() => {
    const track = trackRef.current
    if (!track || groups.length === 0) return
    const width = track.clientWidth
    if (width <= 0) return
    const next = Math.round(track.scrollLeft / width)
    setActiveIndex(Math.min(Math.max(next, 0), groups.length - 1))
  }, [groups.length])

  if (groups.length === 0) {
    return <p className="mobile-shortage-home__empty">暂无缺货数据。</p>
  }

  const useCarousel = groups.length > 1

  return (
    <div className="sales-defer-panel">
      <p className="sales-defer-panel__summary">
        共 {groups.length} 家客户 · {totalLines} 个品
        {useCarousel ? (
          <span className="sales-defer-panel__hint">
            左右滑动切换客户 · {activeIndex + 1}/{groups.length}
          </span>
        ) : (
          <span className="sales-defer-panel__hint">全部酒店 · 全部品项</span>
        )}
      </p>

      {useCarousel ? (
        <>
          <div
            ref={trackRef}
            className="sales-defer-carousel"
            role="region"
            aria-roledescription="carousel"
            aria-label="酒店缺货总览"
            onScroll={syncActiveIndex}
          >
            {groups.map((g) => (
              <div key={g.hotelKey} className="sales-defer-carousel__slide">
                <SalesHotelCard group={g} />
              </div>
            ))}
          </div>
          <div className="sales-defer-carousel__dots" aria-hidden>
            {groups.map((g, i) => (
              <span
                key={g.hotelKey}
                className={`sales-defer-carousel__dot${i === activeIndex ? ' sales-defer-carousel__dot--active' : ''}`}
              />
            ))}
          </div>
        </>
      ) : (
        <SalesHotelCard group={groups[0]} />
      )}
    </div>
  )
}
