import type { ProcurementOaPoOverlayModel } from '../../../utils/procurementOaPreview'

type MobileProcurementOaPoOverlayProps = {
  model: ProcurementOaPoOverlayModel
  onDismiss?: () => void
}

function formatMoney(n: number): string {
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

export function MobileProcurementOaPoOverlay({ model, onDismiss }: MobileProcurementOaPoOverlayProps) {
  const approved = model.outcome === 'approved'

  return (
    <div
      className={`mobile-procurement-oa-po${approved ? ' mobile-procurement-oa-po--approved' : ' mobile-procurement-oa-po--rejected'}`}
      role="region"
      aria-label={approved ? '采购订单已提交' : '原采购订单 OA 未通过'}
    >
      {onDismiss ? (
        <button
          type="button"
          className="mobile-procurement-oa-po__close"
          onClick={onDismiss}
          aria-label="关闭浮窗"
        >
          关闭
        </button>
      ) : null}

      <div className="mobile-procurement-oa-po__banner">
        {approved ? (
          <>
            <span className="mobile-procurement-oa-po__banner-icon" aria-hidden>
              ✓
            </span>
            <span className="mobile-procurement-oa-po__banner-text">采购订单已提交</span>
          </>
        ) : (
          <>
            <span
              className="mobile-procurement-oa-po__banner-icon mobile-procurement-oa-po__banner-icon--warn"
              aria-hidden
            >
              !
            </span>
            <span className="mobile-procurement-oa-po__banner-text">原采购订单 · OA 未通过</span>
          </>
        )}
      </div>

      {!approved && model.rejectReason ? (
        <p className="mobile-procurement-oa-po__reject-reason">
          <strong>驳回原因：</strong>
          {model.rejectReason}
        </p>
      ) : null}

      <dl className="mobile-procurement-oa-po__meta">
        <div className="mobile-procurement-oa-po__meta-row">
          <dt>品名</dt>
          <dd>{model.productName}</dd>
        </div>
        <div className="mobile-procurement-oa-po__meta-row">
          <dt>规格</dt>
          <dd>{model.spec}</dd>
        </div>
        <div className="mobile-procurement-oa-po__meta-row">
          <dt>预计交货期</dt>
          <dd>{model.requiredDeliveryLabel}</dd>
        </div>
        <div className="mobile-procurement-oa-po__meta-row">
          <dt>OA 审批单</dt>
          <dd>{model.oaRequestNo}</dd>
        </div>
      </dl>

      <section className="mobile-procurement-oa-po__suppliers">
        <h3 className="mobile-procurement-oa-po__suppliers-title">供应商采购明细</h3>
        <ul className="mobile-procurement-oa-po__supplier-list">
          {model.suppliers.map((s) => (
            <li key={s.name}>
              <span className="mobile-procurement-oa-po__supplier-name">{s.name}</span>
              <span className="mobile-procurement-oa-po__supplier-detail">
                {s.qty}
                {s.unit} · ¥{s.unitPrice}/{s.unit} · ¥{formatMoney(s.amount)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mobile-procurement-oa-po__total">
        <span>
          采购总量 <strong>{model.totalQty}</strong> {model.unit}
        </span>
        <span className="mobile-procurement-oa-po__total-amount">¥{formatMoney(model.totalAmount)}</span>
      </footer>
    </div>
  )
}
