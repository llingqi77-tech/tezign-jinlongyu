import { useEffect, useMemo, useRef, useState } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import type { ProcurementPoFormState, SkuHotelSubRow } from '../../../types/shortage'
import {
  DELIVERY_METHOD_LABEL,
  PROCUREMENT_FULFILLMENT_CHOICE_LABEL,
} from '../../../constants/shortageLabels'
import { getProcurementSkuGroupForPage, getProcurementSkuOaBucket } from '../../../utils/shortageAggregations'
import { procurementSkuPageHint } from '../../../utils/mobileFulfillmentData'
import { formatSkuProductTitle } from '../../../utils/productDisplay'
import { createPoFormState } from '../../../utils/procurementFormDefaults'
import {
  buildPoFormStateFromOrders,
  buildProcurementOaPoOverlayModel,
  resolvePreviewOaRequestNo,
} from '../../../utils/procurementOaPreview'
import { MobileProcurementOaPoOverlay } from './MobileProcurementOaPoOverlay'

type MobileProcurementSkuPageProps = {
  sku: string
}

function fallbackEntryLabelFromOaBucket(
  bucket: ReturnType<typeof getProcurementSkuOaBucket>
): string {
  switch (bucket) {
    case 'rejected':
      return '已驳回'
    case 'pending':
      return '审批中'
    case 'approved':
      return '已通过'
    default:
      return '待采购处理'
  }
}

function formatMargin(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

function marginTone(value: number): 'negative' | 'positive' | 'neutral' {
  if (value < 0) return 'negative'
  if (value > 0) return 'positive'
  return 'neutral'
}

function marginClassName(base: string, value: number): string {
  const tone = marginTone(value)
  return tone === 'negative'
    ? `${base} ${base}--negative`
    : tone === 'positive'
      ? `${base} ${base}--positive`
      : base
}

function buildUniformForms(
  rows: SkuHotelSubRow[],
  form: ProcurementPoFormState | null
): Record<string, ProcurementPoFormState> {
  if (!form) return {}
  const map: Record<string, ProcurementPoFormState> = {}
  for (const row of rows) {
    map[row.lineId] = { ...form }
  }
  return map
}

function distributeActualFulfillQty(rows: SkuHotelSubRow[], total: number): Record<string, number> {
  if (rows.length === 0) return {}
  const safeTotal = Math.max(0, Math.round(total))
  const totalGap = rows.reduce((sum, row) => sum + row.gap, 0)
  if (totalGap <= 0) return Object.fromEntries(rows.map((row) => [row.lineId, 0]))

  let remaining = safeTotal
  return Object.fromEntries(
    rows.map((row, index) => {
      const qty =
        index === rows.length - 1 ? remaining : Math.round((safeTotal * row.gap) / totalGap)
      remaining -= qty
      return [row.lineId, Math.max(0, qty)]
    })
  )
}

export function MobileProcurementSkuPage({ sku }: MobileProcurementSkuPageProps) {
  const orders = useShortageStore((s) => s.orders)
  const procurementOaPreview = useShortageStore((s) => s.procurementOaPreview)
  const procurementSkuReadOnly = useShortageStore((s) => s.procurementSkuReadOnly)
  const procurementSkuHeaderLabel = useShortageStore((s) => s.procurementSkuHeaderLabel)
  const closeProcurementSkuPage = useShortageStore((s) => s.closeProcurementSkuPage)
  const submitProcurementSkuBatch = useShortageStore((s) => s.submitProcurementSkuBatch)
  const setToast = useShortageStore((s) => s.setToast)

  const oaPreviewApproved = procurementOaPreview === 'approved'
  const oaPreviewRejected = procurementOaPreview === 'rejected'
  const oaPreviewMode = procurementOaPreview != null

  const group = useMemo(() => getProcurementSkuGroupForPage(orders, sku), [orders, sku])

  const oaBucket = useMemo(
    () => (group ? getProcurementSkuOaBucket(group, orders) : 'none'),
    [group, orders]
  )

  const formReadOnly = oaPreviewApproved || procurementSkuReadOnly

  const poRowsByDdl = useMemo(() => {
    if (!group) return []
    return [...group.hotelRows].sort(
      (a, b) =>
        a.requiredDeliveryDate.localeCompare(b.requiredDeliveryDate) ||
        a.lineId.localeCompare(b.lineId)
    )
  }, [group])

  const unitPrice = useMemo(() => {
    const line = orders.flatMap((o) => o.lines).find((l) => l.sku === sku)
    return line?.unitPrice ?? 68
  }, [orders, sku])

  const [form, setForm] = useState<ProcurementPoFormState | null>(null)
  const [detailPageOpen, setDetailPageOpen] = useState(false)
  const [submitSuccessOpen, setSubmitSuccessOpen] = useState(false)
  const [oaOverlayDismissed, setOaOverlayDismissed] = useState(false)
  const seededSkuRef = useRef<string | null>(null)

  /** 仅进入新品项页时初始化；orders 后台更新不再覆盖已填表单 */
  useEffect(() => {
    if (!group) {
      setForm(null)
      seededSkuRef.current = null
      return
    }
    if (seededSkuRef.current === sku) return
    seededSkuRef.current = sku
    const seedFromOrders =
      oaPreviewMode || procurementSkuReadOnly || oaBucket === 'rejected'
    const firstRow = poRowsByDdl[0] ?? group.hotelRows[0]
    const seededForms = seedFromOrders ? buildPoFormStateFromOrders(group, orders) : {}
    const seeded = seededForms[firstRow.lineId]
    const totalSeededActualQty = Object.values(seededForms).reduce(
      (sum, seededForm) => sum + Number(seededForm.actualFulfillQty || 0),
      0
    )
    setForm({
      ...(seeded ?? createPoFormState(firstRow, sku, firstRow.unitPrice ?? unitPrice)),
      actualFulfillQty: String(totalSeededActualQty > 0 ? totalSeededActualQty : group.totalGap),
    })
    setDetailPageOpen(false)
    setOaOverlayDismissed(false)
  }, [group, sku, unitPrice, oaPreviewMode, procurementSkuReadOnly, oaBucket, orders, poRowsByDdl])

  const forms = useMemo(() => buildUniformForms(group?.hotelRows ?? [], form), [group, form])

  const marginSummary = useMemo(() => {
    const procurementPrice = Number(form?.price)
    if (!form?.price.trim() || !Number.isFinite(procurementPrice)) return null
    const margins = poRowsByDdl.map((row) => row.unitPrice - procurementPrice)
    if (margins.length === 0) return null
    const min = Math.min(...margins)
    const max = Math.max(...margins)
    const negativeCount = margins.filter((value) => value < 0).length
    const positiveCount = margins.filter((value) => value > 0).length
    const neutralCount = margins.length - negativeCount - positiveCount
    return { min, max, negativeCount, positiveCount, neutralCount }
  }, [form?.price, poRowsByDdl])

  const oaOverlayModel = useMemo(() => {
    if (!group || !procurementOaPreview) return null
    return buildProcurementOaPoOverlayModel(
      group,
      forms,
      procurementOaPreview,
      resolvePreviewOaRequestNo(orders, sku)
    )
  }, [group, forms, procurementOaPreview, orders, sku])

  if (!group) {
    return (
      <div className="mobile-procurement-page">
        <header className="mobile-procurement-page__header">
          <button type="button" className="mobile-workbench-header__back" onClick={closeProcurementSkuPage}>
            ‹
          </button>
          <h1 className="mobile-procurement-page__title">缺货处理</h1>
        </header>
        <p className="mobile-procurement-page__empty">该品项已处理或不存在。</p>
      </div>
    )
  }

  const showOaOverlay = oaPreviewMode && oaOverlayModel != null && !oaOverlayDismissed
  const oaReopenLabel = oaPreviewApproved ? '查看采购订单' : '查看原采购订单'
  const entryLabel =
    procurementSkuHeaderLabel ?? fallbackEntryLabelFromOaBucket(oaBucket)
  const pageHint = procurementSkuPageHint(entryLabel, {
    readOnly: formReadOnly,
    oaPreviewApproved,
    oaPreviewRejected,
  })

  const firstRow = (poRowsByDdl[0] ?? group.hotelRows[0])!
  const activeForm =
    form ?? createPoFormState(firstRow, sku, firstRow.unitPrice ?? unitPrice)
  const showProcurementFields =
    activeForm.fulfillmentMode === 'urgent' || activeForm.fulfillmentMode === 'defer'

  const poDetailCards = (
    <div className="procurement-po-detail-section__list">
      {poRowsByDdl.map((row) => {
        const procurementPrice = Number(activeForm.price)
        const unitMargin =
          activeForm.price.trim() && Number.isFinite(procurementPrice)
            ? row.unitPrice - procurementPrice
            : null
        return (
          <article key={row.lineId} className="procurement-po-detail-card">
            <div className="procurement-po-detail-card__head">
              <span className="procurement-po-detail-card__hotel">{row.hotelName}</span>
            </div>
            <dl className="procurement-po-detail-card__grid">
              <div>
                <dt>地址</dt>
                <dd>{row.deliveryAddress}</dd>
              </div>
              <div>
                <dt>缺口</dt>
                <dd>
                  {row.gap}
                  {row.unit}
                </dd>
              </div>
              <div>
                <dt>交期</dt>
                <dd>{row.requiredDeliveryDate.slice(5)}</dd>
              </div>
              <div>
                <dt>售价</dt>
                <dd>
                  ¥{row.unitPrice}/{row.unit}
                </dd>
              </div>
              <div>
                <dt>毛利</dt>
                <dd
                  className={
                    unitMargin == null
                      ? undefined
                      : marginClassName('procurement-po-detail-card__margin', unitMargin)
                  }
                >
                  {unitMargin == null
                    ? '填写采购价后计算'
                    : `¥${formatMargin(unitMargin)}/${row.unit}`}
                </dd>
              </div>
            </dl>
          </article>
        )
      })}
    </div>
  )

  const patchForm = (patch: Partial<ProcurementPoFormState>) => {
    if (formReadOnly) return
    setForm((prev) => ({ ...(prev ?? activeForm), ...patch }))
  }

  const handleSubmit = () => {
    const fulfillmentMode = activeForm.fulfillmentMode
    if (!fulfillmentMode) {
      setToast('请选择履约方式')
      return
    }
    const totalActualFulfillQty = Number(activeForm.actualFulfillQty)
    if (
      !activeForm.actualFulfillQty.trim() ||
      !Number.isFinite(totalActualFulfillQty)
    ) {
      setToast('请填写有效的实际供货数量')
      return
    }
    if (totalActualFulfillQty < group.totalGap) {
      setToast(`实际供货数量不能小于缺货数量 ${group.totalGap}${group.unit}`)
      return
    }
    const actualFulfillQtyByLine = distributeActualFulfillQty(group.hotelRows, totalActualFulfillQty)

    const rows = group.hotelRows.map((row) => {
      return {
        lineId: row.lineId,
        fulfillmentMode,
        supplierName: activeForm.supplierName,
        price: Number(activeForm.price),
        eta: activeForm.eta,
        deliveryMethod: activeForm.deliveryMethod,
        logisticsTrackingNo:
          activeForm.deliveryMethod === 'direct'
            ? activeForm.logisticsTrackingNo.trim()
            : undefined,
        remark: activeForm.remark.trim(),
        actualFulfillQty: actualFulfillQtyByLine[row.lineId] ?? 0,
      }
    })

    const ok = submitProcurementSkuBatch({
      sku: group.sku,
      rows,
    })
    if (ok) setSubmitSuccessOpen(true)
  }

  const dismissSubmitSuccess = () => {
    setSubmitSuccessOpen(false)
    closeProcurementSkuPage()
  }

  return (
    <div
      className={`mobile-procurement-page${oaPreviewMode ? ' mobile-procurement-page--oa-preview' : ''}${oaPreviewRejected ? ' mobile-procurement-page--oa-rejected' : ''}${!detailPageOpen && showOaOverlay ? ' mobile-procurement-page--oa-open' : ''}${!detailPageOpen && oaPreviewRejected ? ' mobile-procurement-page--has-footer' : ''}`}
    >
      <header className="mobile-procurement-page__header">
        <button
          type="button"
          className="mobile-workbench-header__back"
          onClick={detailPageOpen ? () => setDetailPageOpen(false) : closeProcurementSkuPage}
          aria-label="返回"
        >
          ‹
        </button>
        <div className="mobile-procurement-page__head-text">
          <h1 className="mobile-procurement-page__title">
            {formatSkuProductTitle(group.productName, group.spec)}
          </h1>
          <p className="mobile-procurement-page__meta">
            共缺 {group.totalGap}
            {group.unit} · 涉及 {group.lineCount} 个酒店 PO · 交期范围{' '}
            {group.earliestRequiredDate.slice(5)} - {group.latestRequiredDate.slice(5)}
          </p>
        </div>
      </header>

      {detailPageOpen ? (
        <div className="mobile-procurement-page__body mobile-procurement-page__body--details">
          <section className="procurement-po-detail-section" aria-label="PO 明细">
            <div className="procurement-po-detail-section__head">
              <h2>酒店 PO 明细</h2>
              <span>涉及 {group.lineCount} 个酒店 PO</span>
            </div>
            {poDetailCards}
          </section>
        </div>
      ) : (
      <div className="mobile-procurement-page__body">
        <div className="mobile-procurement-page__hint-row">
          <p
            className={`mobile-procurement-page__hint${formReadOnly ? ' mobile-procurement-page__hint--readonly' : ''}`}
          >
            {pageHint}
          </p>
          <button
            type="button"
            className="mobile-procurement-page__detail-link"
            onClick={() => setDetailPageOpen(true)}
          >
            查看明细
          </button>
        </div>
        <section className="procurement-sku-form-card" aria-label="统一填写采购信息">
          <div className="procurement-sku-form-card__head">
            <div>
              <h2>统一填写</h2>
            </div>
          </div>

          <div className="procurement-po-row__field">
            <span>履约方式</span>
            <div className="procurement-po-row__toggle">
              {(['urgent', 'defer'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={
                    activeForm.fulfillmentMode === mode
                      ? 'procurement-po-row__opt procurement-po-row__opt--on'
                      : 'procurement-po-row__opt'
                  }
                  onClick={() => patchForm({ fulfillmentMode: mode })}
                  disabled={formReadOnly}
                >
                  {PROCUREMENT_FULFILLMENT_CHOICE_LABEL[mode]}
                </button>
              ))}
            </div>
          </div>

          <label
            className={
              formReadOnly
                ? 'procurement-po-row__field procurement-po-row__field--readonly'
                : 'procurement-po-row__field'
            }
          >
            <span>备注（选填）</span>
            <textarea
              value={activeForm.remark}
              onChange={(e) => patchForm({ remark: e.target.value })}
              placeholder="填写采购处理说明"
              rows={2}
              readOnly={formReadOnly}
            />
          </label>

          <label
            className={
              formReadOnly
                ? 'procurement-po-row__field procurement-po-row__field--readonly'
                : 'procurement-po-row__field'
            }
          >
            <span>实际供货数量（{group.unit}）</span>
            <input
              type="number"
              min={group.totalGap}
              value={activeForm.actualFulfillQty}
              onChange={(e) => patchForm({ actualFulfillQty: e.target.value })}
              onBlur={(e) => {
                const v = Number(e.target.value)
                if (!Number.isFinite(v) || v < group.totalGap) {
                  patchForm({ actualFulfillQty: String(group.totalGap) })
                }
              }}
              readOnly={formReadOnly}
              aria-label="实际补货数量"
            />
          </label>

          {showProcurementFields ? (
            <>
              <label
                className={
                  formReadOnly
                    ? 'procurement-po-row__field procurement-po-row__field--readonly'
                    : 'procurement-po-row__field'
                }
              >
                <span>供应商</span>
                <input
                  type="text"
                  value={activeForm.supplierName}
                  onChange={(e) => patchForm({ supplierName: e.target.value })}
                  placeholder="上次下单供应商"
                  readOnly={formReadOnly}
                />
              </label>

              <label
                className={
                  formReadOnly
                    ? 'procurement-po-row__field procurement-po-row__field--readonly'
                    : 'procurement-po-row__field'
                }
              >
                <span>采购价格（元）</span>
                <input
                  type="number"
                  value={activeForm.price}
                  onChange={(e) => patchForm({ price: e.target.value })}
                  min={1}
                  readOnly={formReadOnly}
                />
              </label>

              {marginSummary ? (
                <button
                  type="button"
                  className={
                    marginSummary.negativeCount > 0
                      ? 'procurement-sku-margin procurement-sku-margin--warning'
                      : 'procurement-sku-margin'
                  }
                  aria-live="polite"
                  onClick={() => setDetailPageOpen(true)}
                >
                  <span className="procurement-sku-margin__label">
                    PO 毛利范围（最低 ~ 最高）
                  </span>
                  <strong>
                    ¥{formatMargin(marginSummary.min)}
                    {marginSummary.min === marginSummary.max
                      ? ''
                      : ` ~ ¥${formatMargin(marginSummary.max)}`}
                    /{group.unit}
                  </strong>
                  <span className="procurement-sku-margin__hint">
                    {marginSummary.negativeCount} 个负毛利 · {marginSummary.positiveCount}{' '}
                    个正毛利
                    {marginSummary.neutralCount > 0
                      ? ` · ${marginSummary.neutralCount} 个持平`
                      : ''}
                  </span>
                  <span className="procurement-sku-margin__cta">查看明细 ›</span>
                </button>
              ) : null}

              <label
                className={
                  formReadOnly
                    ? 'procurement-po-row__field procurement-po-row__field--readonly'
                    : 'procurement-po-row__field'
                }
              >
                <span>预计交货日期</span>
                <input
                  type="date"
                  value={activeForm.eta.slice(0, 10)}
                  onChange={(e) => patchForm({ eta: e.target.value })}
                  readOnly={formReadOnly}
                />
              </label>

              {showProcurementFields ? (
                <div className="procurement-po-row__field">
                  <span>配送方式</span>
                  <div className="procurement-po-row__delivery">
                    {(['warehouse', 'direct'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        className={
                          activeForm.deliveryMethod === method
                            ? 'procurement-po-row__opt procurement-po-row__opt--on'
                            : 'procurement-po-row__opt'
                        }
                        onClick={() =>
                          patchForm({
                            deliveryMethod: method,
                            logisticsTrackingNo:
                              method === 'direct' ? activeForm.logisticsTrackingNo : '',
                          })
                        }
                        disabled={formReadOnly}
                      >
                        {DELIVERY_METHOD_LABEL[method]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {showProcurementFields && activeForm.deliveryMethod === 'direct' ? (
                <label
                  className={
                    formReadOnly
                      ? 'procurement-po-row__field procurement-po-row__field--readonly'
                      : 'procurement-po-row__field'
                  }
                >
                  <span>物流单号（选填）</span>
                  <input
                    type="text"
                    value={activeForm.logisticsTrackingNo}
                    onChange={(e) => patchForm({ logisticsTrackingNo: e.target.value })}
                    placeholder="填写供应商物流单号"
                    readOnly={formReadOnly}
                  />
                </label>
              ) : null}
            </>
          ) : null}
        </section>

      </div>
      )}

      {!detailPageOpen && oaPreviewMode && oaOverlayModel ? (
        showOaOverlay ? (
          <div className="mobile-procurement-page__oa-layer" aria-hidden={false}>
            <button
              type="button"
              className="mobile-procurement-page__oa-scrim"
              onClick={() => setOaOverlayDismissed(true)}
              aria-label="收起采购订单浮窗"
            />
            <div className="mobile-procurement-page__oa-float">
              <MobileProcurementOaPoOverlay
                model={oaOverlayModel}
                onDismiss={() => setOaOverlayDismissed(true)}
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="mobile-procurement-page__oa-reopen"
            onClick={() => setOaOverlayDismissed(false)}
          >
            {oaReopenLabel}
          </button>
        )
      ) : null}

      {!detailPageOpen && !formReadOnly ? (
        <footer className="mobile-procurement-page__footer">
          <button type="button" className="procurement-sku-card__submit" onClick={handleSubmit}>
            提交缺货处理信息
          </button>
        </footer>
      ) : null}

      {submitSuccessOpen ? (
        <div
          className="mobile-procurement-success-dialog mobile-procurement-success-dialog--compact"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="mobile-procurement-success-title"
        >
          <button
            type="button"
            className="mobile-procurement-success-dialog__backdrop"
            onClick={dismissSubmitSuccess}
            aria-label="关闭"
          />
          <div className="mobile-procurement-success-dialog__panel">
            <p id="mobile-procurement-success-title" className="mobile-procurement-success-dialog__title">
              缺货处理信息已提交
            </p>
            <p className="mobile-procurement-success-dialog__sub">
              该品已归入待提交列表。返回首页后，右滑至「提交采购订单」，将同一供应商的缺货品一并发起采购订单与 OA。
            </p>
            <button
              type="button"
              className="mobile-procurement-success-dialog__btn"
              onClick={dismissSubmitSuccess}
            >
              知道了
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
