const DEFAULT_PAGE_SIZE = 5

type MobileListPaginationProps = {
  total: number
  page: number
  pageSize?: number
}

export function MobileListPagination({
  total,
  page,
  pageSize = DEFAULT_PAGE_SIZE,
}: MobileListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  return (
    <nav className="mobile-list-pagination" aria-label="列表分页">
      <span className="mobile-list-pagination__summary">共{total}条</span>
      <span className="mobile-list-pagination__summary" aria-current="page">
        第{safePage}/{totalPages}页
      </span>
    </nav>
  )
}

export function paginateList<T>(items: T[], page: number, pageSize = DEFAULT_PAGE_SIZE): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

export { DEFAULT_PAGE_SIZE as MOBILE_LIST_PAGE_SIZE }
