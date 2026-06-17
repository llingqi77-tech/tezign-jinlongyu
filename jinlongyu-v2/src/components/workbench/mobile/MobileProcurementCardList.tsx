import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import {
  getOaProgressProcurementGroups,
  getPendingProcurementGroups,
  getProcurementSkuOaBucket,
  getProcurementSkuOaLabel,
  getSkuEarliestAwaitingFormDate,
  getSupplierProcurementBatches,
  isProcurementSkuAwaitingForm,
  isProcurementSkuPageReadOnly,
  sortProcurementSkuGroups,
  type ProcurementListSort,
  type ProcurementSkuOaBucket,
} from '../../../utils/shortageAggregations'
import type { ProcurementSkuGroup, ProductCategoryKey, SupplierProcurementBatch } from '../../../types/shortage'
import { formatSkuProductTitle } from '../../../utils/productDisplay'
import { groupItemsByProductCategory } from '../../../utils/productCategory'

const OA_TABS: { id: Exclude<ProcurementSkuOaBucket, 'none'>; label: string }[] = [
  { id: 'rejected', label: '已驳回' },
  { id: 'pending', label: '审批中' },
  { id: 'approved', label: '已通过' },
]

type MobileProcurementCardListProps = {
  /** 对话内嵌面板使用消息上的排序，不读全局 store */
  sortOverride?: 'delivery' | 'supplier' | 'oa'
}

type WorkflowSlide = 'shortage' | 'submit'

export function MobileProcurementCardList({ sortOverride }: MobileProcurementCardListProps = {}) {
  const orders = useShortageStore((s) => s.orders)
  const sort = sortOverride ?? useShortageStore((s) => s.procurementListSort) ?? 'delivery'
  const openProcurementSkuPage = useShortageStore((s) => s.openProcurementSkuPage)
  const submitSupplierProcurementBatch = useShortageStore((s) => s.submitSupplierProcurementBatch)
  const [oaTab, setOaTab] = useState<Exclude<ProcurementSkuOaBucket, 'none'>>('rejected')
  const [categoryTab, setCategoryTab] = useState<ProductCategoryKey | null>(null)
  const [activeSlide, setActiveSlide] = useState<WorkflowSlide>('shortage')
  const carouselRef = useRef<HTMLDivElement>(null)
  const prevBatchCountRef = useRef(0)

  const sortByOa = sort === 'oa'
  const workflowMode = sort === 'delivery' || sort === 'supplier'

  const supplierBatches = useMemo(
    () => (workflowMode ? getSupplierProcurementBatches(orders) : []),
    [orders, workflowMode]
  )

  const oaProgressGroups = useMemo(
    () => (sortByOa ? getOaProgressProcurementGroups(orders) : []),
    [orders, sortByOa]
  )

  const oaTabCounts = useMemo(() => {
    const counts: Record<Exclude<ProcurementSkuOaBucket, 'none'>, number> = {
      rejected: 0,
      pending: 0,
      approved: 0,
    }
    for (const g of oaProgressGroups) {
      const bucket = getProcurementSkuOaBucket(g, orders)
      if (bucket !== 'none') counts[bucket] += 1
    }
    return counts
  }, [oaProgressGroups, orders])

  const sortedGroups = useMemo(() => {
    const source = sortByOa ? oaProgressGroups : getPendingProcurementGroups(orders)
    const list = sortByOa
      ? source.filter((g) => getProcurementSkuOaBucket(g, orders) === oaTab)
      : source
    return sortProcurementSkuGroups(list, orders, sortByOa ? sort : 'delivery')
  }, [orders, sort, oaTab, sortByOa, oaProgressGroups])

  const taskGroups = useMemo(() => {
    if (sortByOa) return sortedGroups
    return sortedGroups.filter((g) => isProcurementSkuAwaitingForm(g, orders))
  }, [sortedGroups, sortByOa, orders])

  const categorySections = useMemo(() => {
    if (sortByOa) return []
    return groupItemsByProductCategory(taskGroups)
  }, [taskGroups, sortByOa])

  useEffect(() => {
    if (sortByOa || categorySections.length === 0) {
      setCategoryTab(null)
      return
    }
    if (categoryTab == null || !categorySections.some((s) => s.key === categoryTab)) {
      setCategoryTab(categorySections[0].key)
    }
  }, [categorySections, categoryTab, sortByOa])

  const activeCategory =
    categorySections.find((s) => s.key === categoryTab) ?? categorySections[0] ?? null

  const displayGroups = sortByOa ? sortedGroups : (activeCategory?.items ?? [])

  const activeTabLabel = OA_TABS.find((t) => t.id === oaTab)?.label ?? ''
  const titleId = sortByOa ? 'mobile-task-list-oa-title' : 'mobile-task-list-workflow-title'

  const step1Active = taskGroups.length > 0
  const step2Active = supplierBatches.length > 0

  const scrollToSlide = (slide: WorkflowSlide) => {
    const el = carouselRef.current
    if (!el) return
    const index = slide === 'shortage' ? 0 : 1
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
    setActiveSlide(slide)
  }

  const handleCarouselScroll = () => {
    const el = carouselRef.current
    if (!el || el.clientWidth <= 0) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setActiveSlide(index === 0 ? 'shortage' : 'submit')
  }

  useEffect(() => {
    if (!workflowMode) return
    if (taskGroups.length === 0 && supplierBatches.length > 0) {
      requestAnimationFrame(() => scrollToSlide('submit'))
    }
  }, [workflowMode, taskGroups.length, supplierBatches.length])

  useEffect(() => {
    if (!workflowMode) return
    if (supplierBatches.length > prevBatchCountRef.current && supplierBatches.length > 0) {
      requestAnimationFrame(() => scrollToSlide('submit'))
    }
    prevBatchCountRef.current = supplierBatches.length
  }, [workflowMode, supplierBatches.length])

  return (
    <section className="mobile-task-list-section" aria-labelledby={titleId}>
      <h2 id={titleId} className="mobile-task-list-section__title">
        {sortByOa ? (
          <>
            OA进度
            <span className="mobile-task-list-section__title-note">（已发起采购的品项）</span>
          </>
        ) : (
          '缺货采购处理'
        )}
      </h2>

      {workflowMode ? (
        <>
          <ProcurementTaskPipeline
            activeSlide={activeSlide}
            step1Count={taskGroups.length}
            step2Count={supplierBatches.length}
            step1Active={step1Active}
            step2Active={step2Active}
            onSelectSlide={scrollToSlide}
          />
          {supplierBatches.length > 0 ? (
            <p className="mobile-procurement-pipeline__alert" role="status">
              有 <strong>{supplierBatches.length}</strong> 个供应商批次待提交，请右滑或点击上方步骤完成采购订单与
              OA
            </p>
          ) : null}
          <div
            ref={carouselRef}
            className="mobile-procurement-carousel"
            onScroll={handleCarouselScroll}
          >
            <div className="mobile-procurement-carousel__pane">
              <ProcurementWorkflowPane
                title="处理缺货信息"
                badge={taskGroups.length > 0 ? `${taskGroups.length} 品待处理` : undefined}
              >
                {taskGroups.length > 0 ? (
                  <>
                    <div
                      className="mobile-task-list-section__category-tabs"
                      role="tablist"
                      aria-label="品类"
                    >
                      {categorySections.map((section) => (
                        <button
                          key={section.key}
                          type="button"
                          role="tab"
                          aria-selected={categoryTab === section.key}
                          className={`mobile-task-list-section__category-tab${
                            categoryTab === section.key
                              ? ' mobile-task-list-section__category-tab--active'
                              : ''
                          }`}
                          onClick={() => setCategoryTab(section.key)}
                        >
                          {section.label}
                          <span className="mobile-task-list-section__category-count">
                            {section.items.length}
                          </span>
                        </button>
                      ))}
                    </div>
                    {displayGroups.length > 0 ? (
                      <ol className="mobile-home-task-list">
                        {displayGroups.map((g, index) => (
                          <ProcurementTaskListItem
                            key={g.sku}
                            group={g}
                            index={index}
                            sort="delivery"
                            orders={orders}
                            onOpen={() =>
                              openProcurementSkuPage(g.sku, {
                                readOnly: false,
                                headerLabel: '待采购处理',
                              })
                            }
                          />
                        ))}
                      </ol>
                    ) : null}
                  </>
                ) : (
                  <p className="mobile-shortage-home__empty">今日暂无待处理缺货品项。</p>
                )}
              </ProcurementWorkflowPane>
            </div>
            <div className="mobile-procurement-carousel__pane">
              <ProcurementWorkflowPane
                title="提交采购订单"
                badge={supplierBatches.length > 0 ? `${supplierBatches.length} 批待提交` : undefined}
                highlight={step2Active}
              >
                {supplierBatches.length === 0 ? (
                  <p className="mobile-shortage-home__empty">
                    {step1Active
                      ? '完成左侧各品缺货信息提交后，将按供应商合并显示在此。'
                      : '填写并提交各品缺货信息后，将按供应商合并显示在此。'}
                  </p>
                ) : (
                  <ol className="mobile-supplier-batch-list">
                    {supplierBatches.map((batch) => (
                      <SupplierBatchCard
                        key={batch.supplierName}
                        batch={batch}
                        onSubmit={() => submitSupplierProcurementBatch(batch.supplierName)}
                        onOpenSku={(sku) =>
                          openProcurementSkuPage(sku, {
                            readOnly: true,
                            headerLabel: '已处理 · 待提交',
                          })
                        }
                      />
                    ))}
                  </ol>
                )}
              </ProcurementWorkflowPane>
            </div>
          </div>
          <div className="mobile-procurement-carousel__dots" aria-hidden>
            <span
              className={`mobile-procurement-carousel__dot${
                activeSlide === 'shortage' ? ' mobile-procurement-carousel__dot--active' : ''
              }`}
            />
            <span
              className={`mobile-procurement-carousel__dot${
                activeSlide === 'submit' ? ' mobile-procurement-carousel__dot--active' : ''
              }`}
            />
          </div>
        </>
      ) : null}

      {sortByOa ? (
        <div className="mobile-task-list-section__tabs" role="tablist" aria-label="OA 状态">
          {OA_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={oaTab === tab.id}
              className={`mobile-task-list-section__tab${oaTab === tab.id ? ' mobile-task-list-section__tab--active' : ''}`}
              onClick={() => setOaTab(tab.id)}
            >
              {tab.label}
              <span className="mobile-task-list-section__tab-count">{oaTabCounts[tab.id]}</span>
            </button>
          ))}
        </div>
      ) : null}

      {sortByOa ? (
        sortedGroups.length === 0 ? (
          <p className="mobile-shortage-home__empty">{activeTabLabel}暂无已提交品项。</p>
        ) : (
          <ol className="mobile-home-task-list">
            {sortedGroups.map((g, index) => (
              <ProcurementTaskListItem
                key={g.sku}
                group={g}
                index={index}
                sort="oa"
                orders={orders}
                onOpen={() => {
                  const oaBucket = getProcurementSkuOaBucket(g, orders)
                  const headerLabel =
                    oaBucket === 'rejected'
                      ? '已驳回'
                      : oaBucket === 'pending'
                        ? '审批中'
                        : oaBucket === 'approved'
                          ? '已通过'
                          : '待采购处理'
                  openProcurementSkuPage(g.sku, {
                    readOnly: isProcurementSkuPageReadOnly(g, orders),
                    headerLabel,
                  })
                }}
              />
            ))}
          </ol>
        )
      ) : null}
    </section>
  )
}

function ProcurementTaskPipeline({
  activeSlide,
  step1Count,
  step2Count,
  step1Active,
  step2Active,
  onSelectSlide,
}: {
  activeSlide: WorkflowSlide
  step1Count: number
  step2Count: number
  step1Active: boolean
  step2Active: boolean
  onSelectSlide: (slide: WorkflowSlide) => void
}) {
  const step2Bottleneck = step2Active

  return (
    <div className="mobile-procurement-pipeline" role="tablist" aria-label="采购处理流程">
      <button
        type="button"
        role="tab"
        aria-selected={activeSlide === 'shortage'}
        className={`mobile-procurement-pipeline__step${
          activeSlide === 'shortage' ? ' mobile-procurement-pipeline__step--active' : ''
        }${step1Active && !step2Active ? ' mobile-procurement-pipeline__step--current' : ''}`}
        onClick={() => onSelectSlide('shortage')}
      >
        <span className="mobile-procurement-pipeline__step-index">1</span>
        <span className="mobile-procurement-pipeline__step-label">处理缺货信息</span>
        {step1Count > 0 ? (
          <span className="mobile-procurement-pipeline__step-count">{step1Count} 品</span>
        ) : (
          <span className="mobile-procurement-pipeline__step-status">已完成</span>
        )}
      </button>
      <span className="mobile-procurement-pipeline__connector" aria-hidden />
      <button
        type="button"
        role="tab"
        aria-selected={activeSlide === 'submit'}
        className={`mobile-procurement-pipeline__step${
          activeSlide === 'submit' ? ' mobile-procurement-pipeline__step--active' : ''
        }${step2Bottleneck ? ' mobile-procurement-pipeline__step--bottleneck' : ''}${
          step2Active ? ' mobile-procurement-pipeline__step--current' : ''
        }`}
        onClick={() => onSelectSlide('submit')}
      >
        <span className="mobile-procurement-pipeline__step-index">2</span>
        <span className="mobile-procurement-pipeline__step-label">提交采购订单</span>
        {step2Count > 0 ? (
          <span className="mobile-procurement-pipeline__step-count mobile-procurement-pipeline__step-count--urgent">
            {step2Count} 批待提交
          </span>
        ) : (
          <span className="mobile-procurement-pipeline__step-status">待生成</span>
        )}
      </button>
    </div>
  )
}

function ProcurementWorkflowPane({
  title,
  badge,
  highlight,
  children,
}: {
  title: string
  badge?: string
  highlight?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`mobile-procurement-pane${
        highlight ? ' mobile-procurement-pane--highlight' : ''
      }`}
    >
      <div className="mobile-procurement-pane__head">
        <h3 className="mobile-procurement-pane__title">{title}</h3>
        {badge ? <span className="mobile-procurement-pane__badge">{badge}</span> : null}
      </div>
      {children}
    </div>
  )
}

function SupplierBatchCard({
  batch,
  onSubmit,
  onOpenSku,
}: {
  batch: SupplierProcurementBatch
  onSubmit: () => void
  onOpenSku: (sku: string) => void
}) {
  return (
    <li className="mobile-supplier-batch-card">
      <div className="mobile-supplier-batch-card__head">
        <div>
          <p className="mobile-supplier-batch-card__name">{batch.supplierName}</p>
          <p className="mobile-supplier-batch-card__meta">
            {batch.skuCount} 个品 · {batch.lineCount} 个酒店 PO · ¥
            {batch.totalAmount.toLocaleString()}
          </p>
        </div>
        <span className="mobile-supplier-batch-card__badge">待提交</span>
      </div>
      <ul className="mobile-supplier-batch-card__products">
        {batch.skuGroups.map((g) => (
          <li key={g.sku}>
            <button
              type="button"
              className="mobile-supplier-batch-card__product"
              onClick={() => onOpenSku(g.sku)}
            >
              {formatSkuProductTitle(g.productName, g.spec)}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="mobile-supplier-batch-card__submit" onClick={onSubmit}>
        提交采购订单与 OA
      </button>
    </li>
  )
}

function ProcurementTaskListItem({
  group,
  index,
  sort,
  orders,
  onOpen,
}: {
  group: ProcurementSkuGroup
  index: number
  sort: ProcurementListSort
  orders: ReturnType<typeof useShortageStore.getState>['orders']
  onOpen: () => void
}) {
  const deliveryDate = getSkuEarliestAwaitingFormDate(group, orders).slice(5)
  const oaBucket = sort === 'oa' ? getProcurementSkuOaBucket(group, orders) : null
  const oaLabel = oaBucket != null ? getProcurementSkuOaLabel(oaBucket) : null

  return (
    <li>
      <button
        type="button"
        className="mobile-home-task-list__item mobile-home-task-list__item--urgent"
        onClick={onOpen}
      >
        <span className="mobile-home-task-list__index" aria-hidden>
          {index + 1}
        </span>
        <span className="mobile-home-task-list__body">
          <span className="mobile-home-task-list__title">
            {formatSkuProductTitle(group.productName, group.spec)}
          </span>
          <span className="mobile-home-task-list__sub">
            共缺 {group.totalGap}
            {group.unit} · 涉及 {group.lineCount} 个酒店 PO
            {sort === 'oa' ? ` · 最早交期 ${deliveryDate}` : ''}
          </span>
          {sort === 'delivery' ? (
            <span
              className="mobile-home-task-list__delivery"
              aria-label={`最早要求交期 ${deliveryDate}`}
            >
              最早交期{' '}
              <span className="mobile-home-task-list__delivery-date">{deliveryDate}</span>
            </span>
          ) : null}
          {oaLabel && oaBucket ? (
            <span
              className={`mobile-home-task-list__oa mobile-home-task-list__oa--${oaBucket}`}
              aria-label={oaLabel}
            >
              {oaLabel}
            </span>
          ) : null}
        </span>
        <span className="mobile-home-task-list__chevron" aria-hidden>
          ›
        </span>
      </button>
    </li>
  )
}
