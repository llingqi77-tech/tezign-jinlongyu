import { Fragment, type ElementType, type ReactNode } from 'react'
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll'
import {
  MOBILE_INFINITE_PAGE_SIZE,
  MobileInfiniteListFooter,
} from './MobileInfiniteListFooter'

export { MOBILE_INFINITE_PAGE_SIZE as MOBILE_LIST_PAGE_SIZE }

type MobileSwipePaginatedListProps<T> = {
  items: T[]
  pageSize?: number
  resetKey?: string | number
  listClassName?: string
  listTag?: 'ul' | 'ol'
  doneLabel?: (total: number) => string
  children: (item: T, index: number, meta: { isEntering: boolean }) => ReactNode
  getItemKey: (item: T) => string
}

export function MobileSwipePaginatedList<T>({
  items,
  pageSize = MOBILE_INFINITE_PAGE_SIZE,
  resetKey,
  listClassName = 'sales-history-list',
  listTag = 'ul',
  doneLabel,
  children,
  getItemKey,
}: MobileSwipePaginatedListProps<T>) {
  const {
    visibleCount,
    hasMore,
    isLoadingMore,
    enterFromIndex,
    sentinelRef,
    pageIndex,
    totalPages,
  } = useInfiniteScroll({
    totalCount: items.length,
    pageSize,
    resetKey,
    loadDelayMs: 900,
  })

  const visibleItems = items.slice(0, visibleCount)
  const ListTag = listTag as ElementType

  return (
    <ListTag className={listClassName}>
      {visibleItems.map((item, index) => (
        <Fragment key={getItemKey(item)}>{children(item, index, { isEntering: index >= enterFromIndex })}</Fragment>
      ))}
      <MobileInfiniteListFooter
        sentinelRef={sentinelRef}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        pageIndex={pageIndex}
        totalPages={totalPages}
        totalCount={items.length}
        pageSize={pageSize}
        doneLabel={doneLabel?.(items.length)}
      />
    </ListTag>
  )
}
