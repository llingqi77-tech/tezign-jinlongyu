import { useEffect, useMemo, useState } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import type {
  HistoryFulfillmentKind,
  HistoryEntity,
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
  getHistoryCityEntityOptions,
  getHistoryCityEntityValue,
  getHistoryHotels,
  parseHistoryCityEntityValue,
  getHotelGroupStatus,
  getPoLineFulfillRate,
  getPoLineSignedState,
  countSignedPoLines,
  getHotelPoLineCounts,
  groupHistoryByHotel,
  groupHistoryBySku,
  summarizeHistoryOrders,
} from '../../../utils/salesHistory'
import { MobileSwipePaginatedList } from './MobileSwipePaginatedList'

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
  expanded,
  onToggleExpanded,
  onOpenSku,
}: {
  hotel: HistoryHotelGroup
  expanded: boolean
  onToggleExpanded: () => void
  onOpenSku: (detail: ActiveDetail) => void
}) {
  const status = getHotelGroupStatus(hotel)
  const hotelLines = getHotelPoLineCounts(hotel)
  return (
    <li className="sales-history-card">
      <div className="sales-history-card__head">
        <div className="sales-history-card__title-wrap">
          <span className="sales-history-card__hotel">{hotel.hotelName}</span>
          <span className={`sales-history-card__status sales-history-card__status--${status}`}>
            {HISTORY_STATUS_LABEL[status]}
          </span>
        </div>
        <button
          type="button"
          className={`sales-history-card__toggle${expanded ? ' sales-history-card__toggle--expanded' : ''}`}
          aria-expanded={expanded}
          aria-label={expanded ? '收起缺货品' : '展开缺货品'}
          onClick={onToggleExpanded}
        >
          <span className="sales-history-card__toggle-icon" aria-hidden />
        </button>
      </div>
      <div className="sales-history-card__meta">
        <span>
          {hotel.skuGroups.length} 个缺货品 · 已签收 {hotelLines.signed}/{hotelLines.total}
        </span>
      </div>
      {expanded ? (
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

  const lineCounts = countSignedPoLines(detail.pos)
  const productTitle = formatSkuProductTitle(detail.productName, detail.spec)

  return (
    <div className="mobile-procurement-page mobile-procurement-page--po-detail">
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
            {detail.showHotel ? productTitle : detail.subtitle}
          </h1>
          <div className="mobile-procurement-page__meta-stack">
            {!detail.showHotel ? (
              <p className="mobile-procurement-page__meta mobile-procurement-page__meta--primary">
                {productTitle}
              </p>
            ) : null}
            <p className="mobile-procurement-page__meta mobile-procurement-page__meta--stats">
              共缺 <strong>{detail.totalQty}{detail.unit}</strong> · 已签{' '}
              <strong>
                {lineCounts.signed}/{lineCounts.total}
              </strong>
            </p>
          </div>
        </div>
      </header>

      <div className="mobile-procurement-page__body">
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
                {detail.showHotel && po.hotelName ? (
                  <p className="sales-po-card__hotel">{po.hotelName}</p>
                ) : null}
                <div className="sales-po-card__head">
                  <span className="sales-po-card__no">{po.poNo}</span>
                  <span
                    className={`sales-history-card__sign${po.signed ? ' sales-history-card__sign--done' : ''}`}
                  >
                    {po.signed ? '已签收' : '未签收'}
                  </span>
                </div>
                <dl className="sales-po-card__fields">
                  <div className="sales-po-card__field">
                    <dt>缺货数量</dt>
                    <dd>
                      {po.qty}
                      {detail.unit}
                    </dd>
                  </div>
                  <div className="sales-po-card__field">
                    <dt>{po.signed ? '收货日期' : '预计收货日期'}</dt>
                    <dd>{po.deliveryDate.slice(5)}</dd>
                  </div>
                  <div className="sales-po-card__field">
                    <dt>履约方式</dt>
                    <dd>
                      <span className={`sales-history-card__tag sales-history-card__tag--${po.kind}`}>
                        {HISTORY_KIND_LABEL[po.kind]}
                      </span>
                    </dd>
                  </div>
                  <div className="sales-po-card__field">
                    <dt>供应商</dt>
                    <dd>{po.supplierName}</dd>
                  </div>
                </dl>
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

function HistoryFilterSelect({
  value,
  onChange,
  options,
  allLabel,
  ariaLabel,
}: {
  value: string | null
  onChange: (value: string | null) => void
  options: { value: string; label: string }[]
  allLabel: string
  ariaLabel: string
}) {
  return (
    <select
      className="sales-history-city-select sales-history-city-select--filter"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label={ariaLabel}
    >
      <option value="">{allLabel}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function HistoryCityEntitySelect({
  city,
  entity,
  cityFilter,
  onChange,
}: {
  city: string | null
  entity: HistoryEntity | null
  cityFilter: string | null
  onChange: (city: string | null, entity: HistoryEntity | null) => void
}) {
  const options = useMemo(() => {
    const all = getHistoryCityEntityOptions()
    if (!cityFilter) return all
    return all.filter((opt) => opt.city === cityFilter)
  }, [cityFilter])

  return (
    <HistoryFilterSelect
      value={getHistoryCityEntityValue(city, entity) || null}
      onChange={(next) => {
        const parsed = parseHistoryCityEntityValue(next ?? '')
        onChange(parsed.city, parsed.entity)
      }}
      allLabel="全部主体"
      ariaLabel="城市主体"
      options={options.map((opt) => ({ value: opt.value, label: opt.label }))}
    />
  )
}

function HistoryCitySelect({
  cities,
  value,
  onChange,
}: {
  cities: string[]
  value: string | null
  onChange: (city: string | null) => void
}) {
  return (
    <HistoryFilterSelect
      value={value}
      onChange={onChange}
      allLabel="全国"
      ariaLabel="城市"
      options={cities.map((city) => ({ value: city, label: city }))}
    />
  )
}

function HistoryCategorySelect({
  value,
  onChange,
}: {
  value: ProductCategoryKey | null
  onChange: (category: ProductCategoryKey | null) => void
}) {
  return (
    <HistoryFilterSelect
      value={value}
      onChange={(next) => onChange((next || null) as ProductCategoryKey | null)}
      allLabel="全部品类"
      ariaLabel="品类"
      options={PRODUCT_CATEGORY_ORDER.map((key) => ({
        value: key,
        label: PRODUCT_CATEGORY_LABEL[key],
      }))}
    />
  )
}

function HistoryHotelSelect({
  hotels,
  value,
  onChange,
}: {
  hotels: string[]
  value: string | null
  onChange: (hotel: string | null) => void
}) {
  return (
    <HistoryFilterSelect
      value={value}
      onChange={onChange}
      allLabel="全部酒店"
      ariaLabel="酒店"
      options={hotels.map((hotel) => ({ value: hotel, label: hotel }))}
    />
  )
}

export function MobileSalesHistoryPage() {
  const role = useShortageStore((s) => s.role)
  const salesHistoryOpen = useShortageStore((s) => s.salesHistoryOpen)
  const closeSalesHistory = useShortageStore((s) => s.closeSalesHistory)
  const procurementOverviewOpen = useShortageStore((s) => s.procurementOverviewOpen)
  const [filter, setFilter] = useState<HistoryOrderFilter>(getDefaultHistoryFilter)
  const [filterStep, setFilterStep] = useState<1 | 2 | 3>(1)
  const [dateOpen, setDateOpen] = useState(false)
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(() => new Set())
  const [activeDetail, setActiveDetail] = useState<ActiveDetail | null>(null)

  // 销售：子页（标题「历史订单查询」，返回对话，城市→日期→酒店 分步筛选）
  // 运营：落地页，复用销售同款视图，标题为「履约数据总览」
  // 采购：落地页，只关注品，按「品(SKU)」全局聚合，无酒店维度、无城市筛选
  const isProcurement = role === 'procurement'
  const pageTitle = role === 'sales' ? '历史订单查询' : '履约数据总览'

  const cities = useMemo(() => getHistoryCities(), [])
  const hotels = useMemo(
    () => getHistoryHotels(filter.city, filter.entity),
    [filter.city, filter.entity],
  )

  const orders = useMemo(() => filterHistoryOrders(filter), [filter])
  const hotelGroups = useMemo(() => groupHistoryByHotel(orders), [orders])
  const skuGroups = useMemo(() => groupHistoryBySku(orders), [orders])
  const summary = useMemo(() => summarizeHistoryOrders(orders), [orders])
  const allHotelsExpanded = useMemo(
    () => hotelGroups.length > 0 && hotelGroups.every((h) => expandedHotels.has(h.hotelName)),
    [hotelGroups, expandedHotels],
  )

  useEffect(() => {
    setFilter(getDefaultHistoryFilter())
    setFilterStep(1)
    setDateOpen(false)
    setActiveDetail(null)
    setExpandedHotels(new Set())
  }, [salesHistoryOpen, procurementOverviewOpen, role])

  useEffect(() => {
    setExpandedHotels(new Set())
  }, [hotelGroups.length, filter.city, filter.entity, filter.hotel, filter.start, filter.end])

  const patch = (next: Partial<HistoryOrderFilter>) => setFilter((prev) => ({ ...prev, ...next }))

  const toggleAllHotelsExpanded = () => {
    if (allHotelsExpanded) {
      setExpandedHotels(new Set())
      return
    }
    setExpandedHotels(new Set(hotelGroups.map((h) => h.hotelName)))
  }

  const toggleHotelExpanded = (hotelName: string) => {
    setExpandedHotels((prev) => {
      const next = new Set(prev)
      if (next.has(hotelName)) next.delete(hotelName)
      else next.add(hotelName)
      return next
    })
  }

  if (activeDetail) {
    return <SkuPoDetail detail={activeDetail} onBack={() => setActiveDetail(null)} />
  }

  const hasDateFilter = Boolean(filter.start || filter.end)
  const dateChipLabel = hasDateFilter
    ? `${filter.start ? filter.start.slice(5) : '起始'} ~ ${filter.end ? filter.end.slice(5) : '至今'}`
    : '收货日期'

  return (
    <div className="mobile-procurement-page">
      <div className="mobile-procurement-page__body">
        <div className="mobile-procurement-page__intro">
          {role === 'sales' ? (
            <button
              type="button"
              className="mobile-workbench-header__back"
              onClick={closeSalesHistory}
              aria-label="返回"
            >
              ‹
            </button>
          ) : null}
          <h1 className="mobile-procurement-page__title">{pageTitle}</h1>
        </div>

        <section className="sales-history-filters" aria-label="筛选条件">
          {isProcurement ? (
            <div
              className="sales-history-filters__row sales-history-filters__row--steps"
              aria-label="分步筛选"
            >
              <div className="sales-history-filters__steps-track">
                <div
                  className={`sales-history-filters__step sales-history-filters__step--city${
                    filterStep === 1 ? ' sales-history-filters__step--current' : ''
                  }${filterStep > 1 ? ' sales-history-filters__step--done' : ''}`}
                >
                  <HistoryCitySelect
                    cities={cities}
                    value={filter.city}
                    onChange={(city) => {
                      patch({ city, category: null })
                      setFilterStep(2)
                    }}
                  />
                </div>

                {filterStep >= 2 ? (
                  <div
                    className={`sales-history-filters__step sales-history-filters__step--category${
                      filterStep === 2 ? ' sales-history-filters__step--current' : ''
                    }`}
                  >
                    <HistoryCategorySelect
                      value={filter.category}
                      onChange={(category) => patch({ category })}
                    />
                  </div>
                ) : null}
              </div>

              <div className="sales-history-filters__date-fixed">
                <button
                  type="button"
                  className={`sales-history-chip sales-history-chip--date${
                    hasDateFilter || dateOpen ? ' sales-history-chip--active' : ''
                  }`}
                  onClick={() => setDateOpen(true)}
                  aria-expanded={dateOpen}
                >
                  <span aria-hidden>📅</span>
                  {dateChipLabel}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="sales-history-filters__row sales-history-filters__row--steps"
              aria-label="分步筛选"
            >
              <div className="sales-history-filters__steps-track sales-history-filters__steps-track--stacked">
                <div
                  className={`sales-history-filters__step sales-history-filters__step--city${
                    filterStep === 1 ? ' sales-history-filters__step--current' : ''
                  }${filterStep > 1 ? ' sales-history-filters__step--done' : ''}`}
                >
                  <HistoryCitySelect
                    cities={cities}
                    value={filter.city}
                    onChange={(city) => {
                      patch({ city, entity: null, hotel: null })
                      setFilterStep(2)
                    }}
                  />
                </div>

                {filterStep >= 2 ? (
                  <div
                    className={`sales-history-filters__step sales-history-filters__step--entity${
                      filterStep === 2 ? ' sales-history-filters__step--current' : ''
                    }${filterStep > 2 ? ' sales-history-filters__step--done' : ''}`}
                  >
                    <HistoryCityEntitySelect
                      city={filter.city}
                      entity={filter.entity}
                      cityFilter={filter.city}
                      onChange={(city, entity) => {
                        patch({ city, entity, hotel: null })
                        setFilterStep(3)
                      }}
                    />
                  </div>
                ) : null}

                {filterStep >= 3 ? (
                  <div
                    className={`sales-history-filters__step sales-history-filters__step--hotel${
                      filterStep === 3 ? ' sales-history-filters__step--current' : ''
                    }`}
                  >
                    <HistoryHotelSelect
                      hotels={hotels}
                      value={filter.hotel}
                      onChange={(hotel) => patch({ hotel })}
                    />
                  </div>
                ) : null}
              </div>

              <div className="sales-history-filters__date-fixed">
                <button
                  type="button"
                  className={`sales-history-chip sales-history-chip--date${
                    hasDateFilter || dateOpen ? ' sales-history-chip--active' : ''
                  }`}
                  onClick={() => setDateOpen(true)}
                  aria-expanded={dateOpen}
                >
                  <span aria-hidden>📅</span>
                  {dateChipLabel}
                </button>
              </div>
            </div>
          )}
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
            <MobileSwipePaginatedList
              items={skuGroups}
              resetKey={`${filter.city}:${filter.category}:${filter.start}:${filter.end}:${skuGroups.length}`}
              getItemKey={(group) => group.sku}
              doneLabel={(total) => `已加载全部 ${total} 个品项`}
            >
              {(group) => <SkuOverviewCard group={group} onOpen={setActiveDetail} />}
            </MobileSwipePaginatedList>
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
                className={`sales-history-expand-touch${allHotelsExpanded ? ' sales-history-expand-touch--expanded' : ''}`}
                role="button"
                tabIndex={0}
                aria-expanded={allHotelsExpanded}
                aria-label={allHotelsExpanded ? '全部收起缺货品' : '全部展开缺货品'}
                onClick={toggleAllHotelsExpanded}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleAllHotelsExpanded()
                  }
                }}
              >
                <span className="sales-history-expand-touch__label">
                  {allHotelsExpanded ? '全部收起' : '全部展开'}
                </span>
                <span className="sales-history-expand-touch__chevrons" aria-hidden>
                  <span className="sales-history-expand-touch__chevron" />
                  <span className="sales-history-expand-touch__chevron" />
                </span>
              </div>
            </div>
            <MobileSwipePaginatedList
              items={hotelGroups}
              resetKey={`${filter.city}:${filter.entity}:${filter.hotel}:${filter.start}:${filter.end}:${hotelGroups.length}`}
              getItemKey={(hotel) => hotel.hotelName}
              doneLabel={(total) => `已加载全部 ${total} 家酒店`}
            >
              {(hotel) => (
                <HotelCard
                  hotel={hotel}
                  expanded={expandedHotels.has(hotel.hotelName)}
                  onToggleExpanded={() => toggleHotelExpanded(hotel.hotelName)}
                  onOpenSku={setActiveDetail}
                />
              )}
            </MobileSwipePaginatedList>
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
