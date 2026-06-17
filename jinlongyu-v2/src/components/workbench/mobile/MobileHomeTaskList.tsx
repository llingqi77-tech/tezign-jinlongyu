import type { RoleTaskItem } from '../../../types/shortage'

const DEFAULT_MAX_VISIBLE = 7

type MobileHomeTaskListProps = {
  tasks: RoleTaskItem[]
  onSelectTask: (task: RoleTaskItem) => void
  /** 欢迎卡内预览条数；任务清单 sheet 用默认 7 */
  maxVisible?: number
  onViewMore?: () => void
}

export function MobileHomeTaskList({
  tasks,
  onSelectTask,
  maxVisible = DEFAULT_MAX_VISIBLE,
  onViewMore,
}: MobileHomeTaskListProps) {
  if (tasks.length === 0) {
    return (
      <p className="mobile-home-task-list__empty">暂无待办任务，可通过对话查询缺货与履约进度。</p>
    )
  }

  const visible = tasks.slice(0, maxVisible)
  const rest = tasks.length - visible.length

  return (
    <ol className="mobile-home-task-list">
      {visible.map((task, index) => (
        <li key={task.id}>
          <button
            type="button"
            className="mobile-home-task-list__item"
            onClick={() => onSelectTask(task)}
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
      {rest > 0 ? (
        <li className="mobile-home-task-list__more">
          {onViewMore ? (
            <button type="button" className="mobile-home-task-list__more-btn" onClick={onViewMore}>
              还有 {rest} 项待办 · 查看全部
            </button>
          ) : (
            <span className="mobile-home-task-list__more-text">还有 {rest} 项待办</span>
          )}
        </li>
      ) : null}
    </ol>
  )
}
