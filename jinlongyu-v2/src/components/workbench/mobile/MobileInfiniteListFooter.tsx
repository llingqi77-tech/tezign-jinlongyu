import type { Ref } from 'react'

export const MOBILE_INFINITE_PAGE_SIZE = 10

type MobileInfiniteListFooterProps = {
  sentinelRef: Ref<HTMLLIElement>
  hasMore: boolean
  isLoadingMore: boolean
  pageIndex: number
  totalPages: number
  totalCount: number
  pageSize: number
  doneLabel?: string
}

export function MobileInfiniteListFooter({
  sentinelRef,
  hasMore,
  isLoadingMore,
  pageIndex,
  totalPages,
  totalCount,
  pageSize,
  doneLabel,
}: MobileInfiniteListFooterProps) {
  if (totalCount <= pageSize) return null

  return (
    <li
      ref={sentinelRef}
      className={`mobile-infinite-list__load-more${
        isLoadingMore ? ' mobile-infinite-list__load-more--loading' : ''
      }`}
      aria-live="polite"
    >
      {hasMore ? (
        <>
          {isLoadingMore ? (
            <ul className="mobile-infinite-list__skeleton-list" aria-hidden>
              {[0, 1, 2].map((key) => (
                <li key={key} className="mobile-infinite-list__skeleton-row">
                  <span className="mobile-infinite-list__skeleton-line mobile-infinite-list__skeleton-line--title" />
                  <span className="mobile-infinite-list__skeleton-line mobile-infinite-list__skeleton-line--sub" />
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mobile-infinite-list__load-status">
            <span
              className={`mobile-infinite-list__spinner${
                isLoadingMore ? ' mobile-infinite-list__spinner--active' : ''
              }`}
              role={isLoadingMore ? 'status' : undefined}
              aria-label={isLoadingMore ? '正在加载' : undefined}
              aria-hidden={!isLoadingMore}
            />
            <span className="mobile-infinite-list__load-text">
              {isLoadingMore
                ? `正在加载第 ${pageIndex + 1} 页…`
                : `上滑加载更多 · 第 ${pageIndex}/${totalPages} 页`}
            </span>
          </div>
        </>
      ) : (
        <p className="mobile-infinite-list__load-done">
          {doneLabel ?? `已加载全部 ${totalCount} 条`}
        </p>
      )}
    </li>
  )
}
