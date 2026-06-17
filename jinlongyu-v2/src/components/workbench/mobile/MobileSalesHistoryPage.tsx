import { useMemo, useState } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import type {
  HistoryEntity,
  HistoryFulfillmentKind,
  HistoryHotelGroup,
  HistoryHotelSkuGroup,
  HistoryOrderFilter,
  HistorySkuGroup,
  HistorySkuPo,
  ProductCategoryKey,
} from '../../../types/shortage'
import { formatSkuProductTitle } from '../../../utils/productDisplay'
import { PRODUCT_CATEGORY_LABEL, PRODUCT_CATEGORY_ORDER } from '../../../utils/productCategory'
import {
  HISTORY_KIND_LABEL,
  HISTORY_STATUS_LABEL,
  HISTORY_MAX_DATE_RANGE_DAYS,
  clampHistoryDateRange,
  filterHistoryOrders,
  getDefaultHistoryFilter,
  getHistoryCities,
  getHistoryEntities,
  getHistoryHotels,
  getHotelGroupStatus,
  getPoLineFulfillRate,
  getPoLineSignedState,
  countSignedPoLines,
  getHotelPoLineCounts,
  groupHistoryByHotel,
  groupHistoryBySku,
  summarizeHistoryOrders,
} from '../../../utils/salesHistory'

const PO_KIND_FILTERS: { value: HistoryFulfillmentKind | null; label: string }[] = [
  { value: null, label: '全部方式' },
  { value: 'urgent', label: '加急' },
  { value: 'defer', label: '延期' },
]

const PO_SIGNED_FILTERS: { value: 'all' | 'signed' | 'unsigned'; label: string }[] = [
  { value: 'all', label: '全部签收' },
  { value: 'signed', label: '已签收' },
  { value: 'unsigned', label: '未签收' },
]

function SummaryDimensionHeading({ title, tip }: { title: string; tip: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="sales-history-summary__heading-wrap">
      <p className="sales-history-summary__heading">{title}</p>
      <button
        type="button"
        className="sales-history-summary__help"
        aria-label={`${title}说明`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      {open ? <p className="sales-history-summary__tip">{tip}</p> : null}
    </div>
  )
}

interface ActiveDetail {
  productName: string
  spec: string
  unit: string
  totalQty: number
  signedQty: number
  poCount: number
  pos: HistorySkuPo[]
  /** 副标题：酒店名（销售/运营）或「N 家酒店」（采购） */
  subtitle: string
  /** PO 行是否展示所属酒店（采购按品聚合时为 true） */
  showHotel: boolean
}

function hotelSkuToDetail(hotelName: string, sku: HistoryHotelSkuGroup): ActiveDetail {
  return {
    productName: sku.productName,
    spec: sku.spec,
    unit: sku.unit,
    totalQty: sku.totalQty,
    signedQty: sku.signedQty,
    poCount: sku.poCount,
    pos: sku.pos,
    subtitle: hotelName,
    showHotel: false,
  }
}

function skuGroupToDetail(group: HistorySkuGroup): ActiveDetail {
  return {
    productName: group.productName,
    spec: group.spec,
    unit: group.unit,
    totalQty: group.totalQty,
    signedQty: group.signedQty,
    poCount: group.poCount,
    pos: group.pos,
    subtitle: `${group.hotelCount} 家酒店`,
    showHotel: true,
  }
}

function HotelCard({
  hotel,
  detailsExpanded,
  onOpenSku,
}: {
  hotel: HistoryHotelGroup
  detailsExpanded: boolean
  onOpenSku: (detail: ActiveDetail) => void
}) {
  const status = getHotelGroupStatus(hotel)
  const hotelLines = getHotelPoLineCounts(hotel)
  return (
    <li className="sales-history-card">
      <div className="sales-history-card__head">
        <div className="sales-history-card__title-wrap">
          <span className="sales-history-card__hotel">{hotel.hotelName}</span>
        </div>
        <span className={`sales-history-card__status sales-history-card__status--${status}`}>
          {HISTORY_STATUS_LABEL[status]}
        </span>
      </div>
      <div className="sales-history-card__meta">
        <span>
          {hotel.skuGroups.length} 个缺货品 · 已签收 {hotelLines.signed}/{hotelLines.total}
        </span>
      </div>
      {detailsExpanded ? (
        <ul className="sales-history-card__skus">
          {hotel.skuGroups.map((sku) => {
            const { signed: lineSigned, total: lineTotal } = countSignedPoLines(sku.pos)
            const signedState = getPoLineSignedState(sku.pos)
            return (
              <li key={sku.sku} className="sales-history-sku">
                <button
                  type="button"
                  className="sales-history-sku__btn"
                  onClick={() => onOpenSku(hotelSkuToDetail(hotel.hotelName, sku))}
                >
                  <span className="sales-history-sku__main">
                    <span className="sales-history-sku__name">
                      {formatSkuProductTitle(sku.productName, sku.spec)}
                    </span>
                    <span className="sales-history-sku__sub">
                      共缺 {sku.totalQty}
                      {sku.unit} · {sku.poCount} 个 PO
                    </span>
                  </span>
                  <span className="sales-history-sku__right">
                    <span
                      className={`sales-history-sku__signed sales-history-sku__signed--${signedState}`}
                    >
                      已签 {lineSigned}/{lineTotal}
                    </span>
                    <span className="sales-history-sku__chevron" aria-hidden>
                      ›
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </li>
  )
}

function SkuOverviewCard({
  group,
  onOpen,
}: {
  group: HistorySkuGroup
  onOpen: (detail: ActiveDetail) => void
}) {
  const lineSignedCount = group.pos.filter((p) => p.signed).length
  const lineTotal = group.poCount
  const signedState = getPoLineSignedState(group.pos)
  const rate = getPoLineFulfillRate(lineSignedCount, lineTotal)
  return (
    <li className="sales-history-card sales-history-sku-card">
      <button
        type="button"
        className="sales-history-sku__btn"
        onClick={() => onOpen(skuGroupToDetail(group))}
      >
        <span className="sales-history-sku__main">
          <span className="sales-history-sku__name sales-history-sku__name--lg">
            {formatSkuProductTitle(group.productName, group.spec)}
          </span>
          <span className="sales-history-sku__sub">
            共缺 {group.totalQty}
            {group.unit} · {group.poCount} 个 PO · {group.hotelCount} 家酒店
          </span>
        </span>
        <span className="sales-history-sku__right">
          <span className="sales-history-sku-card__rate">
            {rate}%<span className="sales-history-sku-card__rate-label">订单行完成率</span>
          </span>
          <span
            className={`sales-history-sku__signed sales-history-sku__signed--${signedState}`}
          >
            已签 {lineSignedCount}/{lineTotal}
          </span>
          <span className="sales-history-sku__chevron" aria-hidden>
            ›
          </span>
        </span>
      </button>
    </li>
  )
}

function SkuPoDetail({ detail, onBack }: { detail: ActiveDetail; onBack: () => void }) {
  const [kindFilter, setKindFilter] = useState<HistoryFulfillmentKind | null>(null)
  const [signedFilter, setSignedFilter] = useState<'all' | 'signed' | 'unsigned'>('all')

  const filteredPos = useMemo(() => {
    return detail.pos.filter((po) => {
      if (kindFilter && po.kind !== kindFilter) return false
      if (signedFilter === 'signed' && !po.signed) return false
      if (signedFilter === 'unsigned' && po.signed) return false
      return true
    })
  }, [detail.pos, kindFilter, signedFilter])

  const hasPoFilter = kindFilter !== null || signedFilter !== 'all'
  const lineCounts = countSignedPoLines(detail.pos)

  return (
    <div className="mobile-procurement-page">
      <header className="mobile-procurement-page__header">
        <button
          type="button"
          className="mobile-workbench-header__back"
          onClick={onBack}
          aria-label="返回"
        >
          ‹
        </button>
        <div className="mobile-procurement-page__head-text">
          <h1 className="mobile-procurement-page__title">
            {formatSkuProductTitle(detail.productName, detail.spec)}
          </h1>
          <p className="mobile-procurement-page__meta">
            {detail.subtitle} · 共缺 {detail.totalQty}
            {detail.unit} · 已签收 {lineCounts.signed}/{lineCounts.total}
          </p>
        </div>
      </header>

      <div className="mobile-procurement-page__body">
        <p className="sales-po-hint">
          {hasPoFilter
            ? `显示 ${filteredPos.length} / ${detail.poCount} 个 PO（按收货日期倒序）`
            : `该品在筛选范围内关联 ${detail.poCount} 个 PO（按收货日期倒序）`}
        </p>
        <div className="sales-po-filters">
          <select
            className="sales-history-city-select"
            value={kindFilter ?? ''}
            onChange={(e) =>
              setKindFilter((e.target.value || null) as HistoryFulfillmentKind | null)
            }
            aria-label="履约方式"
          >
            {PO_KIND_FILTERS.map((opt) => (
              <option key={opt.value ?? 'all'} value={opt.value ?? ''}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className="sales-history-city-select"
            value={signedFilter}
            onChange={(e) =>
              setSignedFilter(e.target.value as 'all' | 'signed' | 'unsigned')
            }
            aria-label="签收状态"
          >
            {PO_SIGNED_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {filteredPos.length === 0 ? (
          <p className="sales-history-empty">当前筛选条件下暂无 PO。</p>
        ) : (
          <ul className="sales-po-list">
            {filteredPos.map((po, i) => (
            <li key={`${po.poNo}-${i}`} className="sales-po-card">
              <div className="sales-po-card__head">
                <span className="sales-po-card__no">
                  {po.poNo}
                  {detail.showHotel && po.hotelName ? (
                    <span className="sales-po-card__hotel">{po.hotelName}</span>
                  ) : null}
                </span>
                <span
                  className={`sales-history-card__sign${po.signed ? ' sales-history-card__sign--done' : ''}`}
                >
                  {po.signed ? '已签收' : '未签收'}
                </span>
              </div>
              <div className="sales-po-card__meta">
                <span>
                  {po.signed ? '收货日期' : '预计收货日期'} {po.deliveryDate.slice(5)}
                </span>
                <span>·</span>
                <span className="sales-po-card__qty">
                  {po.qty}
                  {detail.unit}
                </span>
                <span className={`sales-history-card__tag sales-history-card__tag--${po.kind}`}>
                  {HISTORY_KIND_LABEL[po.kind]}
                </span>
              </div>
              <p className="sales-po-card__supplier">{po.supplierName}</p>
            </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

const pad2 = (n: number) => String(n).padStart(2, '0')
const toDateKey = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`

function addDaysToKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate())
}

function buildMonths(monthsBack: number) {
  const today = new Date()
  const list: { year: number; month: number }[] = []
  for (let i = monthsBack; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    list.push({ year: d.getFullYear(), month: d.getMonth() })
  }
  return list
}

function SalesHistoryDatePicker({
  start,
  end,
  onClose,
  onConfirm,
}: {
  start: string
  end: string
  onClose: () => void
  onConfirm: (start: string, end: string) => void
}) {
  const [draftStart, setDraftStart] = useState(start)
  const [draftEnd, setDraftEnd] = useState(end)
  const months = useMemo(() => buildMonths(11), [])
  const todayKey = useMemo(() => {
    const t = new Date()
    return toDateKey(t.getFullYear(), t.getMonth(), t.getDate())
  }, [])
  const maxEndKey = useMemo(
    () => (draftStart ? addDaysToKey(draftStart, HISTORY_MAX_DATE_RANGE_DAYS - 1) : null),
    [draftStart],
  )

  const handleDayTap = (key: string) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(key)
      setDraftEnd('')
    } else if (key < draftStart) {
      setDraftStart(key)
      setDraftEnd('')
    } else {
      const { end } = clampHistoryDateRange(draftStart, key)
      setDraftEnd(end)
    }
  }

  return (
    <div className="sales-date-picker" role="dialog" aria-modal="true" aria-label="选择日期段">
      <button type="button" className="sales-date-picker__scrim" aria-label="关闭" onClick={onClose} />
      <div className="sales-date-picker__sheet">
        <header className="sales-date-picker__header">
          <span className="sales-date-picker__title">选择日期</span>
          <button type="button" className="sales-date-picker__close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>

        <div className="sales-date-picker__weekdays">
          {WEEKDAY_LABELS.map((label, i) => (
            <span
              key={label}
              className={`sales-date-picker__weekday${i === 0 || i === 6 ? ' sales-date-picker__weekday--weekend' : ''}`}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="sales-date-picker__scroll">
          {months.map(({ year, month }) => {
            const firstWeekday = new Date(year, month, 1).getDay()
            const daysInMonth = new Date(year, month + 1, 0).getDate()
            const cells: (number | null)[] = []
            for (let i = 0; i < firstWeekday; i++) cells.push(null)
            for (let d = 1; d <= daysInMonth; d++) cells.push(d)

            return (
              <section key={`${year}-${month}`} className="sales-date-picker__month">
                <h3 className="sales-date-picker__month-title">
                  {year}年{month + 1}月
                </h3>
                <div className="sales-date-picker__grid">
                  {cells.map((day, idx) => {
                    if (day == null) {
                      return <span key={`blank-${idx}`} className="sales-date-picker__cell" />
                    }
                    const key = toDateKey(year, month, day)
                    const isStart = key === draftStart
                    const isEnd = key === draftEnd
                    const inRange =
                      Boolean(draftStart && draftEnd) && key > draftStart && key < draftEnd
                    const isFuture = key > todayKey
                    const pickingEnd = Boolean(draftStart && !draftEnd)
                    const isBeforeStart = pickingEnd && key < draftStart
                    const isBeyondMaxRange =
                      pickingEnd && maxEndKey != null && key > maxEndKey
                    const classNames = ['sales-date-picker__cell', 'sales-date-picker__day']
                    if (isStart) classNames.push('sales-date-picker__day--start')
                    if (isEnd) classNames.push('sales-date-picker__day--end')
                    if (inRange) classNames.push('sales-date-picker__day--in-range')
                    if (isFuture || isBeforeStart || isBeyondMaxRange) {
                      classNames.push('sales-date-picker__day--disabled')
                    }
                    return (
                      <button
                        key={key}
                        type="button"
                        className={classNames.join(' ')}
                        disabled={isFuture || isBeforeStart || isBeyondMaxRange}
                        onClick={() => handleDayTap(key)}
                      >
                        <span className="sales-date-picker__day-num">{day}</span>
                        {isStart ? <span className="sales-date-picker__day-tag">起</span> : null}
                        {isEnd ? <span className="sales-date-picker__day-tag">止</span> : null}
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        <footer className="sales-date-picker__footer">
          <p className="sales-date-picker__range-notice">
            日期区间最长不超过 {HISTORY_MAX_DATE_RANGE_DAYS} 天
          </p>
          <div className="sales-date-picker__footer-actions">
            <div className="sales-date-picker__summary">
              <span>起 {draftStart ? draftStart.slice(5) : '--'}</span>
              <span>止 {draftEnd ? draftEnd.slice(5) : '--'}</span>
            </div>
            <button
            type="button"
            className="sales-date-picker__confirm"
            disabled={!draftStart || !draftEnd}
            onClick={() => {
              const { start: nextStart, end: nextEnd } = clampHistoryDateRange(draftStart, draftEnd)
              onConfirm(nextStart, nextEnd)
            }}
          >
            确定
          </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

export function MobileSalesHistoryPage() {
  const role = useShortageStore((s) => s.role)
  const closeSalesHistory = useShortageStore((s) => s.closeSalesHistory)
  const closeProcurementOverview = useShortageStore((s) => s.closeProcurementOverview)
  const closeWorkbench = useShortageStore((s) => s.closeWorkbench)
  const [filter, setFilter] = useState<HistoryOrderFilter>(getDefaultHistoryFilter)
  const [filterStep, setFilterStep] = useState<1 | 2 | 3>(1)
  const [allDetailsExpanded, setAllDetailsExpanded] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [activeDetail, setActiveDetail] = useState<ActiveDetail | null>(null)

  // 销售：子页（标题「历史订单查询」，返回对话，城市→酒店→品→PO）
  // 运营：落地页，复用销售同款视图，标题为「履约数据总览」
  // 采购：落地页，只关注品，按「品(SKU)」全局聚合，无酒店维度、无城市筛选
  const isProcurement = role === 'procurement'
  const pageTitle = role === 'sales' ? '历史订单查询' : '履约数据总览'
  const pageMeta = isProcurement
    ? '按城市 / 品类 / 品查看缺货履约总情况'
    : '按城市 / 主体 / 酒店 / 收货日期查看过往履约情况'
  // 销售/采购为对话内子页（返回上一级），运营为落地页（返回角色选择）
  const onBack = isProcurement
    ? closeProcurementOverview
    : role === 'sales'
      ? closeSalesHistory
      : closeWorkbench

  const cities = useMemo(() => getHistoryCities(), [])
  const entities = useMemo(() => getHistoryEntities(filter.city), [filter.city])
  const hotels = useMemo(
    () => getHistoryHotels(filter.city, filter.entity),
    [filter.city, filter.entity],
  )

  const orders = useMemo(() => filterHistoryOrders(filter), [filter])
  const hotelGroups = useMemo(() => groupHistoryByHotel(orders), [orders])
  const skuGroups = useMemo(() => groupHistoryBySku(orders), [orders])
  const summary = useMemo(() => summarizeHistoryOrders(orders), [orders])

  const patch = (next: Partial<HistoryOrderFilter>) => setFilter((prev) => ({ ...prev, ...next }))

  if (activeDetail) {
    return <SkuPoDetail detail={activeDetail} onBack={() => setActiveDetail(null)} />
  }

  const hasDateFilter = Boolean(filter.start || filter.end)
  const dateChipLabel = hasDateFilter
    ? `${filter.start ? filter.start.slice(5) : '起始'} ~ ${filter.end ? filter.end.slice(5) : '至今'}`
    : '收货日期'

  return (
    <div className="mobile-procurement-page">
      <header className="mobile-procurement-page__header">
        <button
          type="button"
          className="mobile-workbench-header__back"
          onClick={onBack}
          aria-label="返回"
        >
          ‹
        </button>
        <div className="mobile-procurement-page__head-text">
          <h1 className="mobile-procurement-page__title">{pageTitle}</h1>
          <p className="mobile-procurement-page__meta">{pageMeta}</p>
        </div>
      </header>

      <div className="mobile-procurement-page__body">
        <section className="sales-history-filters" aria-label="筛选条件">
          <div className="sales-history-filters__row">
            {isProcurement ? (
              <>
                <select
                  className="sales-history-city-select"
                  value={filter.city ?? ''}
                  onChange={(e) => patch({ city: e.target.value || null })}
                  aria-label="城市"
                >
                  <option value="">全国</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <select
                  className="sales-history-city-select"
                  value={filter.category ?? ''}
                  onChange={(e) =>
                    patch({ category: (e.target.value || null) as ProductCategoryKey | null })
                  }
                  aria-label="品类"
                >
                  <option value="">全部品类</option>
                  {PRODUCT_CATEGORY_ORDER.map((key) => (
                    <option key={key} value={key}>
                      {PRODUCT_CATEGORY_LABEL[key]}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <select
                className="sales-history-city-select"
                value={filter.city ?? ''}
                onChange={(e) => {
                  patch({ city: e.target.value || null, entity: null, hotel: null })
                  setFilterStep(2)
                }}
                aria-label="城市"
              >
                <option value="">全国</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className={`sales-history-chip sales-history-chip--date${
                hasDateFilter || dateOpen ? ' sales-history-chip--active' : ''
              }`}
              onClick={() => setDateOpen((v) => !v)}
              aria-expanded={dateOpen}
            >
              <span aria-hidden>📅</span>
              {dateChipLabel}
            </button>
          </div>

          {!isProcurement && filterStep >= 2 ? (
            <div className="sales-history-filters__row">
              <select
                className="sales-history-city-select"
                value={filter.entity ?? ''}
                onChange={(e) => {
                  patch({
                    entity: (e.target.value || null) as HistoryEntity | null,
                    hotel: null,
                  })
                  setFilterStep(3)
                }}
                aria-label="主体"
              >
                <option value="">全部主体</option>
                {entities.map((entity) => (
                  <option key={entity} value={entity}>
                    {entity}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {!isProcurement && filterStep >= 3 ? (
            <div className="sales-history-filters__row">
              <select
                className="sales-history-city-select"
                value={filter.hotel ?? ''}
                onChange={(e) => patch({ hotel: e.target.value || null })}
                aria-label="酒店"
              >
                <option value="">全部酒店</option>
                {hotels.map((hotel) => (
                  <option key={hotel} value={hotel}>
                    {hotel}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </section>

        <div className="sales-history-summary-block">
          <SummaryDimensionHeading
            title="商品维度"
            tip="所有酒店的所有 PO 的同一个品计 1 个商品；该品下全部 PO 订单行均已签收才算已履约。履约完成率 = 已履约商品数 ÷ 缺货商品数"
          />
          <section className="sales-history-summary" aria-label="商品维度统计">
            <div className="sales-history-summary__item">
              <strong>
                {summary.skuCount}
                <span className="sales-history-summary__unit">个</span>
              </strong>
              <span>缺货商品数</span>
            </div>
            <div className="sales-history-summary__item">
              <strong>
                {summary.skuFulfilledCount}
                <span className="sales-history-summary__unit">个</span>
              </strong>
              <span>已履约商品数</span>
            </div>
            <div className="sales-history-summary__item">
              <strong>{summary.skuFulfillRate}%</strong>
              <span>履约完成率</span>
            </div>
          </section>
        </div>

        <div className="sales-history-summary-block">
          <SummaryDimensionHeading
            title="订单行维度"
            tip="每个酒店、每个 PO 里的每个品计 1 行；该行已签收即为已履约。履约完成率 = 已履约订单行数 ÷ 缺货订单行数"
          />
          <section className="sales-history-summary" aria-label="订单行维度统计">
            <div className="sales-history-summary__item">
              <strong>{summary.lineCount}</strong>
              <span>缺货订单行</span>
            </div>
            <div className="sales-history-summary__item">
              <strong>{summary.lineFulfilledCount}</strong>
              <span>已履约订单行</span>
            </div>
            <div className="sales-history-summary__item">
              <strong>{summary.lineFulfillRate}%</strong>
              <span>履约完成率</span>
            </div>
          </section>
        </div>

        {isProcurement ? (
          skuGroups.length === 0 ? (
            <p className="sales-history-empty">该筛选条件下暂无缺货品。</p>
          ) : (
            <ul className="sales-history-list">
              {skuGroups.map((group) => (
                <SkuOverviewCard key={group.sku} group={group} onOpen={setActiveDetail} />
              ))}
            </ul>
          )
        ) : hotelGroups.length === 0 ? (
          <p className="sales-history-empty">该筛选条件下暂无历史订单。</p>
        ) : (
          <>
            <div className="sales-history-list-toolbar">
              <span className="sales-history-list-toolbar__label">
                共 {hotelGroups.length} 家酒店
              </span>
              <div
                className={`sales-history-expand-touch${allDetailsExpanded ? ' sales-history-expand-touch--expanded' : ''}`}
                role="button"
                tabIndex={0}
                aria-expanded={allDetailsExpanded}
                aria-label={allDetailsExpanded ? '全部收起缺货品' : '全部展开缺货品'}
                onClick={() => setAllDetailsExpanded((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setAllDetailsExpanded((v) => !v)
                  }
                }}
              >
                <span className="sales-history-expand-touch__label">
                  {allDetailsExpanded ? '全部收起' : '全部展开'}
                </span>
                <span className="sales-history-expand-touch__chevrons" aria-hidden>
                  <span className="sales-history-expand-touch__chevron" />
                  <span className="sales-history-expand-touch__chevron" />
                </span>
              </div>
            </div>
            <ul className="sales-history-list">
              {hotelGroups.map((hotel) => (
                <HotelCard
                  key={hotel.hotelName}
                  hotel={hotel}
                  detailsExpanded={allDetailsExpanded}
                  onOpenSku={setActiveDetail}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {dateOpen ? (
        <SalesHistoryDatePicker
          start={filter.start}
          end={filter.end}
          onClose={() => setDateOpen(false)}
          onConfirm={(start, end) => {
            const { start: nextStart, end: nextEnd } = clampHistoryDateRange(start, end)
            patch({ start: nextStart, end: nextEnd })
            setDateOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
