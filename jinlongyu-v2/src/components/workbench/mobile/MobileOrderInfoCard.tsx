import type { MobileOrderInfoDetail } from '../../../types/shortage'

type MobileOrderInfoCardProps = {
  details: MobileOrderInfoDetail[]
  progress?: string
  taskIndex?: number
  fulfillmentMethodLabel?: string
  fulfillmentFieldLabel?: string
  fulfillmentDetail?: string
  completed?: boolean
}

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('zh-CN')}`
}

export function MobileOrderInfoCard({
  details,
  progress,
  taskIndex,
  fulfillmentMethodLabel,
  fulfillmentFieldLabel = '履约方式',
  fulfillmentDetail,
  completed = false,
}: MobileOrderInfoCardProps) {
  if (details.length === 0) return null

  const title = taskIndex ? `第${taskIndex}个订单信息` : '订单信息'

  return (
    <div
      className={`mobile-order-info-card${completed ? ' mobile-order-info-card--completed' : ''}`}
    >
      <p className="mobile-order-info-card__title">{title}</p>
      {details.map((detail) => (
        <dl
          key={`${detail.hotelName}-${detail.productName}-${detail.spec}`}
          className="mobile-order-info-card__grid"
        >
          <div>
            <dt>酒店名称</dt>
            <dd>{detail.hotelName}</dd>
          </div>
          <div className="mobile-order-info-card__wide">
            <dt>酒店地址</dt>
            <dd>{detail.hotelAddress}</dd>
          </div>
          <div>
            <dt>缺货品</dt>
            <dd>{detail.productName}</dd>
          </div>
          <div>
            <dt>规格</dt>
            <dd>{detail.spec}</dd>
          </div>
          <div>
            <dt>缺货数量</dt>
            <dd>
              {detail.gap}
              {detail.unit}
            </dd>
          </div>
          <div>
            <dt>交货日期</dt>
            <dd>{detail.deliveryDate}</dd>
          </div>
          <div>
            <dt>单价</dt>
            <dd>{formatCurrency(detail.unitPrice)}</dd>
          </div>
          <div>
            <dt>总价</dt>
            <dd>{formatCurrency(detail.totalAmount)}</dd>
          </div>
          {!completed && progress ? (
            <div className="mobile-order-info-card__wide">
              <dt>当前进度</dt>
              <dd>{progress}</dd>
            </div>
          ) : null}
          {fulfillmentMethodLabel ? (
            <div className="mobile-order-info-card__fulfillment mobile-order-info-card__wide">
              <dt>{fulfillmentFieldLabel}</dt>
              <dd>
                <span className="mobile-order-info-card__fulfillment-choice">{fulfillmentMethodLabel}</span>
                {fulfillmentDetail ? (
                  <span className="mobile-order-info-card__fulfillment-reason">
                    {fulfillmentDetail}
                  </span>
                ) : null}
              </dd>
            </div>
          ) : null}
          <div className="mobile-order-info-card__wide">
            <dt>备注</dt>
            <dd>{detail.remark}</dd>
          </div>
        </dl>
      ))}
    </div>
  )
}
