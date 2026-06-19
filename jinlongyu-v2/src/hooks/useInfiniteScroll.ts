import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_PAGE_SIZE = 10

function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null
  let parent = el.parentElement
  while (parent) {
    const { overflowY } = getComputedStyle(parent)
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return parent
    }
    parent = parent.parentElement
  }
  return null
}

type UseInfiniteScrollOptions = {
  totalCount: number
  pageSize?: number
  resetKey?: string | number
  loadDelayMs?: number
}

export function useInfiniteScroll({
  totalCount,
  pageSize = DEFAULT_PAGE_SIZE,
  resetKey,
  loadDelayMs = 900,
}: UseInfiniteScrollOptions) {
  const [visibleCount, setVisibleCount] = useState(() => Math.min(pageSize, totalCount))
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [enterFromIndex, setEnterFromIndex] = useState(() => Math.min(pageSize, totalCount))

  const sentinelRef = useRef<HTMLLIElement>(null)
  const loadingRef = useRef(false)
  const wasIntersectingRef = useRef(false)
  const hasUserScrolledRef = useRef(false)
  const loadTimeoutRef = useRef<number | null>(null)
  const totalCountRef = useRef(totalCount)
  const visibleCountRef = useRef(visibleCount)
  const resetKeyRef = useRef<string | number | undefined>(undefined)

  totalCountRef.current = totalCount
  visibleCountRef.current = visibleCount

  const hasMore = visibleCount < totalCount
  const pageIndex = Math.ceil(visibleCount / pageSize)
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  useEffect(() => {
    const resetKeyChanged = resetKeyRef.current !== resetKey
    resetKeyRef.current = resetKey

    if (resetKeyChanged) {
      if (loadTimeoutRef.current != null) {
        window.clearTimeout(loadTimeoutRef.current)
        loadTimeoutRef.current = null
      }
      const nextVisible = Math.min(pageSize, totalCount)
      setVisibleCount(nextVisible)
      setEnterFromIndex(nextVisible)
      setIsLoadingMore(false)
      loadingRef.current = false
      wasIntersectingRef.current = false
      hasUserScrolledRef.current = false
      return
    }

    setVisibleCount((prev) => Math.min(prev, totalCount))
  }, [resetKey, pageSize, totalCount])

  const loadNextPage = useCallback(() => {
    if (loadingRef.current) return
    if (visibleCountRef.current >= totalCountRef.current) return

    loadingRef.current = true
    setIsLoadingMore(true)
    const nextFrom = visibleCountRef.current

    loadTimeoutRef.current = window.setTimeout(() => {
      loadTimeoutRef.current = null
      setEnterFromIndex(nextFrom)
      setVisibleCount((prev) => Math.min(prev + pageSize, totalCountRef.current))
      setIsLoadingMore(false)
      loadingRef.current = false
    }, loadDelayMs)
  }, [loadDelayMs, pageSize])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const root = getScrollParent(sentinel)

    const onScroll = () => {
      hasUserScrolledRef.current = true
    }
    root?.addEventListener('scroll', onScroll, { passive: true })

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return

        const isIntersecting = entry.isIntersecting
        const entered = isIntersecting && !wasIntersectingRef.current

        if (entered && visibleCountRef.current < totalCountRef.current && !loadingRef.current) {
          if (hasUserScrolledRef.current || root == null) {
            loadNextPage()
          }
        }

        wasIntersectingRef.current = isIntersecting
      },
      { root, rootMargin: '0px 0px 120px 0px', threshold: 0 }
    )

    observer.observe(sentinel)

    return () => {
      root?.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [loadNextPage, totalCount])

  return {
    visibleCount,
    hasMore,
    isLoadingMore,
    enterFromIndex,
    sentinelRef,
    pageIndex,
    totalPages,
  }
}
