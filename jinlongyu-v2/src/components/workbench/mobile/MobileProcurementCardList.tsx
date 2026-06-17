import { useEffect, useMemo, useState } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import {
  getOaProgressProcurementGroups,
  getPendingProcurementGroups,
  getProcurementSkuOaBucket,
  getProcurementSkuOaLabel,
  getSkuEarliestAwaitingFormDate,
  isProcurementSkuAwaitingForm,
  isProcurementSkuPageReadOnly,
  sortProcurementSkuGroups,
  type ProcurementListSort,
  type ProcurementSkuOaBucket,
} from '../../../utils/shortageAggregations'
import type { ProcurementSkuGroup, ProductCategoryKey } from '../../../types/shortage'
import { formatSkuProductTitle } from '../../../utils/productDisplay'
import { groupItemsByProductCategory } from '../../../utils/productCategory'

const OA_TABS: { id: Exclude<ProcurementSkuOaBucket, 'none'>; label: string }[] = [
  { id: 'rejected', label: '已驳回' },
  { id: 'pending', label: '审批中' },
  { id: 'approved', label: '已通过' },
]

type MobileProcurementCardListProps = {
  /** 对话内嵌面板使用消息上的排序，不读全局 store */
  sortOverride?: 'delivery' | 'oa'
}

export function MobileProcurementCardList({ sortOverride }: MobileProcurementCardListProps = {}) {
  const orders = useShortageStore((s) => s.orders)
  const sort = sortOverride ?? useShortageStore((s) => s.procurementListSort) ?? 'delivery'
  const openProcurementSkuPage = useShortageStore((s) => s.openProcurementSkuPage)
  const [oaTab, setOaTab] = useState<Exclude<ProcurementSkuOaBucket, 'none'>>('rejected')
  const [categoryTab, setCategoryTab] = useState<ProductCategoryKey | null>(null)

  const sortByOa = sort === 'oa'

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
    return sortProcurementSkuGroups(list, orders, sort)
  }, [orders, sort, oaTab, sortByOa, oaProgressGroups])

  const taskGroups = useMemo(() => {
    if (sortByOa) return sortedGroups
    return sortedGroups.filter((g) => isProcurementSkuAwaitingForm(g, orders))
  }, [sortedGroups, sortByOa, orders])

  const categorySections = useMemo(() => {
    if (sortByOa) return []
    return groupItemsByProductCategory(taskGroups)
  }, [taskGroups, sortByOa])

  const taskCount = taskGroups.length

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
  const titleId = sortByOa ? 'mobile-task-list-oa-title' : 'mobile-task-list-todo-title'

  return (
    <section className="mobile-task-list-section" aria-labelledby={titleId}>
      <h2 id={titleId} className="mobile-task-list-section__title">
        {sortByOa ? (
          <>
            OA进度
            <span className="mobile-task-list-section__title-note">（只统计已提交的）</span>
          </>
        ) : (
          '待办清单'
        )}
      </h2>
        {!sortByOa && taskCount > 0 ? (
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
                  categoryTab === section.key ? ' mobile-task-list-section__category-tab--active' : ''
                }`}
                onClick={() => setCategoryTab(section.key)}
              >
                {section.label}
                <span className="mobile-task-list-section__category-count">{section.items.length}</span>
              </button>
            ))}
          </div>
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
      {taskCount === 0 ? (
        <p className="mobile-shortage-home__empty">
          {sortByOa ? `${activeTabLabel}暂无已提交品项。` : '今日暂无待处理缺货品项。'}
        </p>
      ) : displayGroups.length > 0 ? (
        <ol className="mobile-home-task-list">
          {displayGroups.map((g, index) => (
            <ProcurementTaskListItem
              key={g.sku}
              group={g}
              index={index}
              sort={sort}
              orders={orders}
              onOpen={() => {
                const oaBucket = sort === 'oa' ? getProcurementSkuOaBucket(g, orders) : null
                const headerLabel =
                  sort === 'delivery'
                    ? '待采购处理'
                    : oaBucket === 'rejected'
                      ? '已驳回'
                      : oaBucket === 'pending'
                        ? '审批中'
                        : oaBucket === 'approved'
                          ? '已通过'
                          : '待采购处理'
                openProcurementSkuPage(g.sku, {
                  readOnly: sort === 'oa' ? isProcurementSkuPageReadOnly(g, orders) : false,
                  headerLabel,
                })
              }}
            />
          ))}
        </ol>
      ) : null}
    </section>
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
