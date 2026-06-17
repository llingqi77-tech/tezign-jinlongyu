import { useMemo, useState } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import type { MobileTaskListTab } from '../../../utils/mobileAgentSummary'
import type { RoleTaskItem } from '../../../types/shortage'
import {
  getMobileTaskListHotels,
  getMobileTaskListItems,
} from '../../../utils/mobileAgentSummary'

export function MobileTaskListSheet() {
  const open = useShortageStore((s) => s.mobileTaskListOpen)
  const close = useShortageStore((s) => s.closeMobileTaskListSheet)
  const orders = useShortageStore((s) => s.orders)
  const role = useShortageStore((s) => s.role)

  const [tab, setTab] = useState<MobileTaskListTab>('pending')
  const [hotel, setHotel] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  const hotels = useMemo(() => getMobileTaskListHotels(orders, role), [orders, role])
  const items = useMemo(
    () => getMobileTaskListItems(orders, role, tab, hotel, sortAsc),
    [orders, role, tab, hotel, sortAsc]
  )

  if (!open) return null

  const pickTask = (_task: RoleTaskItem) => {
    close()
  }

  return (
    <div className="mobile-sheet mobile-task-list-sheet" role="dialog" aria-modal="true" aria-label="任务清单">
      <button type="button" className="mobile-sheet__backdrop" onClick={close} aria-label="关闭" />
      <div className="mobile-sheet__panel mobile-sheet__panel--tall">
        <header className="mobile-sheet__header">
          <h2 className="mobile-sheet__title">任务清单</h2>
          <button type="button" className="mobile-sheet__close" onClick={close} aria-label="关闭">
            ✕
          </button>
        </header>

        <div className="mobile-task-list-sheet__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'pending'}
            className={`mobile-task-list-sheet__tab ${tab === 'pending' ? 'mobile-task-list-sheet__tab--active' : ''}`}
            onClick={() => setTab('pending')}
          >
            未完成
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'done'}
            className={`mobile-task-list-sheet__tab ${tab === 'done' ? 'mobile-task-list-sheet__tab--active' : ''}`}
            onClick={() => setTab('done')}
          >
            已完成
          </button>
        </div>

        <div className="mobile-task-list-sheet__filters">
          <label className="mobile-task-list-sheet__filter">
            <span className="sr-only">筛选酒店</span>
            <select
              value={hotel ?? ''}
              onChange={(e) => setHotel(e.target.value || null)}
              className="mobile-task-list-sheet__select"
            >
              <option value="">全部酒店</option>
              {hotels.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="mobile-task-list-sheet__sort"
            onClick={() => setSortAsc((v) => !v)}
          >
            交期 {sortAsc ? '↑' : '↓'}
          </button>
        </div>

        <div className="mobile-sheet__body mobile-task-list-sheet__list">
          {items.length === 0 ? (
            <p className="mobile-task-list-sheet__empty">暂无任务</p>
          ) : (
            <ol className="mobile-home-task-list">
              {items.map((task, index) => (
                <li key={task.id}>
                  <button
                    type="button"
                    className="mobile-home-task-list__item"
                    onClick={() => tab === 'pending' && pickTask(task)}
                    disabled={tab === 'done'}
                  >
                    <span className="mobile-home-task-list__index" aria-hidden>
                      {index + 1}
                    </span>
                    <span className="mobile-home-task-list__body">
                      <span className="mobile-home-task-list__title">{task.title}</span>
                      <span className="mobile-home-task-list__sub">{task.sub}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
