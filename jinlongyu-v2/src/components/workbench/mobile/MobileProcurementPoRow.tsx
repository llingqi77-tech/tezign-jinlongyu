import type { ProcurementPoFormState, SkuHotelSubRow } from '../../../types/shortage'
import {
  DELIVERY_METHOD_LABEL,
  PROCUREMENT_FULFILLMENT_CHOICE_LABEL,
} from '../../../constants/shortageLabels'
import { resolveActualFulfillQty } from '../../../utils/procurementFormDefaults'
function formatMargin(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

type MobileProcurementPoRowProps = {
  row: SkuHotelSubRow
  form: ProcurementPoFormState
  onChange: (patch: Partial<ProcurementPoFormState>) => void
  readOnly?: boolean
}

export function MobileProcurementPoRow({
  row,
  form,
  onChange,
  readOnly = false,
}: MobileProcurementPoRowProps) {
  const actualQty = resolveActualFulfillQty(form.fulfillmentMode, row.gap)
  const showProcurementFields =
    form.fulfillmentMode === 'urgent' || form.fulfillmentMode === 'defer'
  const isUrgent = form.fulfillmentMode === 'urgent'

  const procurementPrice = Number(form.price)
  const hasProcurementPrice =
    showProcurementFields && form.price !== '' && Number.isFinite(procurementPrice)
  const unitMargin = hasProcurementPrice ? row.unitPrice - procurementPrice : null
  const marginTone =
    unitMargin == null ? null : unitMargin < 0 ? 'negative' : unitMargin > 0 ? 'positive' : 'neutral'

  return (
    <div className={`procurement-po-row${readOnly ? ' procurement-po-row--readonly' : ''}`}>
      <div className="procurement-po-row__head">
        <strong>{row.hotelName}</strong>
      </div>
      <p className="procurement-po-row__addr">{row.deliveryAddress}</p>
      <p className="procurement-po-row__meta">
        需求 {row.gap}
        {row.unit} · 交期 {row.requiredDeliveryDate.slice(5)}
        <span className="procurement-po-row__sales-ref">
          售价 ¥{row.unitPrice}/{row.unit}
        </span>
      </p>

      <div className="procurement-po-row__field">
        <span>履约方式</span>
        <div className="procurement-po-row__toggle">
          {(['urgent', 'defer'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={
                form.fulfillmentMode === mode
                  ? 'procurement-po-row__opt procurement-po-row__opt--on'
                  : 'procurement-po-row__opt'
              }
              onClick={() => !readOnly && onChange({ fulfillmentMode: mode })}
              disabled={readOnly}
            >
              {PROCUREMENT_FULFILLMENT_CHOICE_LABEL[mode]}
            </button>
          ))}
        </div>
      </div>

      <label className="procurement-po-row__field procurement-po-row__field--readonly">
        <span>实际补货数量</span>
        <input type="text" readOnly value={`${actualQty}${row.unit}`} />
      </label>

      {showProcurementFields ? (
        <>
          <label
            className={
              readOnly
                ? 'procurement-po-row__field procurement-po-row__field--readonly'
                : 'procurement-po-row__field'
            }
          >
            <span>供应商</span>
            <input
              type="text"
              value={form.supplierName}
              onChange={(e) => onChange({ supplierName: e.target.value })}
              placeholder="上次下单供应商"
              readOnly={readOnly}
            />
          </label>
          <label
            className={
              readOnly
                ? 'procurement-po-row__field procurement-po-row__field--readonly'
                : 'procurement-po-row__field'
            }
          >
            <span>采购价格（元）</span>
            <input
              type="number"
              value={form.price}
              onChange={(e) => onChange({ price: e.target.value })}
              min={1}
              readOnly={readOnly}
            />
            {unitMargin != null ? (
              <p
                className={
                  marginTone === 'negative'
                    ? 'procurement-po-row__margin procurement-po-row__margin--negative'
                    : marginTone === 'positive'
                      ? 'procurement-po-row__margin procurement-po-row__margin--positive'
                      : 'procurement-po-row__margin'
                }
                aria-live="polite"
              >
                毛利 ¥{formatMargin(unitMargin)}/{row.unit}
              </p>
            ) : null}
          </label>
          <label
            className={
              readOnly
                ? 'procurement-po-row__field procurement-po-row__field--readonly'
                : 'procurement-po-row__field'
            }
          >
            <span>预计交货日期</span>
            <input
              type="date"
              value={form.eta.slice(0, 10)}
              onChange={(e) => onChange({ eta: e.target.value })}
              readOnly={readOnly}
            />
          </label>
          {isUrgent ? (
            <div className="procurement-po-row__field">
              <span>配送方式</span>
              <div className="procurement-po-row__delivery">
                {(['warehouse', 'direct'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={
                      form.deliveryMethod === m
                        ? 'procurement-po-row__opt procurement-po-row__opt--on'
                        : 'procurement-po-row__opt'
                    }
                    onClick={() =>
                      !readOnly &&
                      onChange({
                        deliveryMethod: m,
                        logisticsTrackingNo: m === 'direct' ? form.logisticsTrackingNo : '',
                      })
                    }
                    disabled={readOnly}
                  >
                    {DELIVERY_METHOD_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {isUrgent && form.deliveryMethod === 'direct' ? (
            <label
              className={
                readOnly
                  ? 'procurement-po-row__field procurement-po-row__field--readonly'
                  : 'procurement-po-row__field'
              }
            >
              <span>物流单号（选填）</span>
              <input
                type="text"
                value={form.logisticsTrackingNo}
                onChange={(e) => onChange({ logisticsTrackingNo: e.target.value })}
                placeholder="填写供应商物流单号"
                readOnly={readOnly}
              />
            </label>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
