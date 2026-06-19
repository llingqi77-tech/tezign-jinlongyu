import { useMemo, useState, type ReactNode } from 'react'
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll'
import { MobileInfiniteListFooter } from './MobileInfiniteListFooter'
import { useShortageStore } from '../../../store/shortageStore'
import type { SalesHotelDataPanelState, SalesHotelLineItem } from '../../../types/shortage'
import { groupByHotel } from '../../../utils/shortageAggregations'
import { formatSkuProductTitle } from '../../../utils/productDisplay'
import {
  SALES_HOTEL_CMD_PREFIX,
  splitSalesHotelLines,
  type SalesHotelChannel,
} from '../../../utils/mobileSalesHotelData'
import { formatSalesDeferLineDetail } from '../../../utils/salesNoticeDisplay'
import { sendSalesHotelPanelAction } from '../../../utils/mobileAgentDialogue'

type MobileSalesHotelDataPanelProps = {
  panel: SalesHotelDataPanelState
}

const CHANNEL_SECTIONS: {
  key: SalesHotelChannel
  label: string
  tone: 'pending' | 'defer' | 'urgent'
}[] = [
  { key: 'pending', label: '待处理', tone: 'pending' },
  { key: 'defer', label: '延期', tone: 'defer' },
  { key: 'urgent', label: '加急', tone: 'urgent' },
]

function formatHotelPanelLineDetail(line: SalesHotelLineItem, tone: SalesHotelChannel): ReactNode {
  const delivery = line.requiredDeliveryDate.slice(5)
  if (tone === 'defer') {
    const deferDetail = formatSalesDeferLineDetail(line)
    return (
      <>
        缺 {line.gap}
        {line.unit} · 最早交期 {deferDetail.deliveryLabel}，采购预计{' '}
        <span
          className={deferDetail.etaLate ? 'mobile-sales-hotel-panel__eta--late' : undefined}
        >
          {deferDetail.etaLabel}
        </span>{' '}
        到货
      </>
    )
  }
  if (tone === 'urgent' && line.eta?.trim()) {
    return (
      <>
        缺 {line.gap}
        {line.unit} · 最早交期 {delivery} · 采购预计 {line.eta.slice(5)} 到货
      </>
    )
  }
  return (
    <>
      缺 {line.gap}
      {line.unit} · 最早交期 {delivery}
    </>
  )
}

function HotelLineItem({ line, tone }: { line: SalesHotelLineItem; tone: SalesHotelChannel }) {
  return (
    <li className="mobile-sales-hotel-panel__line">
      <div className="mobile-sales-hotel-panel__line-head">
        <strong>{formatSkuProductTitle(line.productName, line.spec)}</strong>
      </div>
      <span className="mobile-sales-hotel-panel__line-detail">
        {formatHotelPanelLineDetail(line, tone)}
      </span>
    </li>
  )
}

function HotelChannelSection({
  label,
  lines,
  tone,
}: {
  label: string
  lines: SalesHotelLineItem[]
  tone: 'pending' | 'defer' | 'urgent'
}) {
  if (lines.length === 0) return null
  return (
    <section
      className={`mobile-sales-hotel-panel__section mobile-sales-hotel-panel__section--${tone}`}
    >
      <h3 className="mobile-sales-hotel-panel__section-title">
        {label}
        <span className="mobile-sales-hotel-panel__section-count">{lines.length}</span>
      </h3>
      <ul className="mobile-sales-hotel-panel__line-list">
        {lines.map((line) => (
          <HotelLineItem key={line.lineId} line={line} tone={tone} />
        ))}
      </ul>
    </section>
  )
}

function HotelInlineExpand({ hotelKey }: { hotelKey: string }) {
  const orders = useShortageStore((s) => s.orders)
  const group = useMemo(
    () => groupByHotel(orders).find((g) => g.hotelKey === hotelKey) ?? null,
    [orders, hotelKey]
  )

  if (!group) return null

  const { pendingLines, deferLines, urgentLines } = splitSalesHotelLines(group)
  const linesByChannel: Record<SalesHotelChannel, SalesHotelLineItem[]> = {
    pending: pendingLines,
    defer: deferLines,
    urgent: urgentLines,
  }

  return (
    <div className="mobile-sales-hotel-panel__expand">
      {CHANNEL_SECTIONS.map((section) => (
        <HotelChannelSection
          key={section.key}
          label={section.label}
          lines={linesByChannel[section.key]}
          tone={section.tone}
        />
      ))}
    </div>
  )
}

function SalesHotelOverviewPanel({
  panel,
}: {
  panel: Extract<SalesHotelDataPanelState, { level: 'overview' }>
}) {
  const [expandedHotelKey, setExpandedHotelKey] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [hotelFilter, setHotelFilter] = useState<'processed' | 'pending'>('pending')

  const filteredHotels = useMemo(() => {
    const keyword = searchText.trim()
    const hotels = panel.hotels.filter((row) =>
      hotelFilter === 'processed' ? row.processed : !row.processed
    )
    if (!keyword) return hotels
    return hotels.filter((row) => row.hotelName.includes(keyword))
  }, [hotelFilter, panel.hotels, searchText])

  const toggleHotel = (hotelKey: string) => {
    setExpandedHotelKey((prev) => (prev === hotelKey ? null : hotelKey))
  }

  const openHotelFilter = (filter: 'processed' | 'pending') => {
    setHotelFilter(filter)
    setSearchText('')
    setExpandedHotelKey(null)
  }

  const openSalesHistory = useShortageStore((s) => s.openSalesHistory)

  const listResetKey = `${hotelFilter}:${searchText.trim()}`
  const {
    visibleCount,
    hasMore,
    isLoadingMore,
    enterFromIndex,
    sentinelRef,
    pageIndex,
    totalPages,
  } = useInfiniteScroll({
    totalCount: filteredHotels.length,
    pageSize: 10,
    resetKey: listResetKey,
    loadDelayMs: 900,
  })

  const visibleHotels = filteredHotels.slice(0, visibleCount)

  return (
    <div className="mobile-sales-hotel-panel" role="group" aria-label="按酒店数据总览">
      <div className="mobile-sales-hotel-panel__header">
        <div className="mobile-sales-hotel-panel__hero" aria-label="今日缺货品">
          <span className="mobile-sales-hotel-panel__hero-label">今日缺货品</span>
          <span className="mobile-sales-hotel-panel__hero-value">{panel.skuCount}</span>
        </div>
        <button
          type="button"
          className="mobile-sales-hotel-panel__history-entry"
          onClick={openSalesHistory}
        >
          <span>历史订单查询</span>
          <span aria-hidden>›</span>
        </button>
      </div>
      <div className="mobile-sales-hotel-panel__filters" aria-label="酒店处理状态">
        <button
          type="button"
          className={`mobile-sales-hotel-panel__stat mobile-sales-hotel-panel__stat--pending${
            hotelFilter === 'pending' ? ' mobile-sales-hotel-panel__stat--active' : ''
          }`}
          onClick={() => openHotelFilter('pending')}
          aria-pressed={hotelFilter === 'pending'}
        >
          <span className="mobile-sales-hotel-panel__stat-value">{panel.pendingHotelCount}</span>
          <span className="mobile-sales-hotel-panel__stat-label">待处理酒店</span>
        </button>
        <button
          type="button"
          className={`mobile-sales-hotel-panel__stat mobile-sales-hotel-panel__stat--processed${
            hotelFilter === 'processed' ? ' mobile-sales-hotel-panel__stat--active' : ''
          }`}
          onClick={() => openHotelFilter('processed')}
          aria-pressed={hotelFilter === 'processed'}
        >
          <span className="mobile-sales-hotel-panel__stat-value">{panel.processedHotelCount}</span>
          <span className="mobile-sales-hotel-panel__stat-label">已处理酒店</span>
        </button>
      </div>
      {panel.hotels.length === 0 ? (
        <p className="mobile-sales-hotel-panel__empty">今日暂无缺货记录。</p>
      ) : (
        <>
          <label className="mobile-sales-hotel-panel__search">
            <span className="mobile-sales-hotel-panel__search-label">
              搜索{hotelFilter === 'processed' ? '已处理' : '待处理'}酒店
            </span>
            <input
              type="search"
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value)
                setExpandedHotelKey(null)
              }}
              placeholder="输入酒店名称关键词"
              aria-label="搜索酒店名称"
            />
          </label>
          {filteredHotels.length === 0 ? (
            <p className="mobile-sales-hotel-panel__empty">未找到匹配酒店。</p>
          ) : (
            <ul className="mobile-sales-hotel-panel__list">
              {visibleHotels.map((row, index) => {
                const isOpen = expandedHotelKey === row.hotelKey
                const isEntering = index >= enterFromIndex
                return (
                  <li
                    key={row.hotelKey}
                    className={`mobile-sales-hotel-panel__item${isOpen ? ' mobile-sales-hotel-panel__item--open' : ''}${
                      isEntering ? ' mobile-sales-hotel-panel__item--enter' : ''
                    }`}
                    style={
                      isEntering
                        ? { animationDelay: `${(index - enterFromIndex) * 0.07}s` }
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      className={`mobile-sales-hotel-panel__row${isOpen ? ' mobile-sales-hotel-panel__row--open' : ''}`}
                      aria-expanded={isOpen}
                      onClick={() => toggleHotel(row.hotelKey)}
                    >
                      <span className="mobile-sales-hotel-panel__row-text">
                        <span className="mobile-sales-hotel-panel__row-title">
                          <span className="mobile-sales-hotel-panel__row-label">{row.hotelName}</span>
                        </span>
                        <span className="mobile-sales-hotel-panel__row-addr">{row.deliveryAddress}</span>
                        <span className="mobile-sales-hotel-panel__row-meta">
                          <span>{row.lineCount} 个缺货品</span>
                        </span>
                      </span>
                      <span
                        className={`mobile-sales-hotel-panel__chevron${isOpen ? ' mobile-sales-hotel-panel__chevron--open' : ''}`}
                        aria-hidden
                      >
                        ›
                      </span>
                    </button>
                    {isOpen ? <HotelInlineExpand hotelKey={row.hotelKey} /> : null}
                  </li>
                )
              })}
              {filteredHotels.length > 10 ? (
                <MobileInfiniteListFooter
                  sentinelRef={sentinelRef}
                  hasMore={hasMore}
                  isLoadingMore={isLoadingMore}
                  pageIndex={pageIndex}
                  totalPages={totalPages}
                  totalCount={filteredHotels.length}
                  pageSize={10}
                  doneLabel={`已加载全部 ${filteredHotels.length} 家酒店`}
                />
              ) : null}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export function MobileSalesHotelDataPanel({ panel }: MobileSalesHotelDataPanelProps) {
  if (panel.level === 'overview') {
    return <SalesHotelOverviewPanel panel={panel} />
  }

  const linesByChannel: Record<SalesHotelChannel, SalesHotelLineItem[]> = {
    pending: panel.pendingLines,
    defer: panel.deferLines,
    urgent: panel.urgentLines,
  }

  return (
    <div className="mobile-sales-hotel-panel" role="group" aria-label={`${panel.hotelName}缺货明细`}>
      <button
        type="button"
        className="mobile-sales-hotel-panel__back"
        onClick={() => sendSalesHotelPanelAction('返回酒店列表', `${SALES_HOTEL_CMD_PREFIX}back`)}
      >
        ‹ 返回酒店列表
      </button>
      <header className="mobile-sales-hotel-panel__hotel-head">
        <h3 className="mobile-sales-hotel-panel__hotel-title">{panel.hotelName}</h3>
        <p className="mobile-sales-hotel-panel__hotel-addr">{panel.deliveryAddress}</p>
      </header>
      {CHANNEL_SECTIONS.map((section) => (
        <HotelChannelSection
          key={section.key}
          label={section.label}
          lines={linesByChannel[section.key]}
          tone={section.tone}
        />
      ))}
    </div>
  )
}
