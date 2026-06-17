import type { ReactNode } from 'react'

type MobileChatMessageGridProps = {
  side: 'agent' | 'user'
  time?: string
  bodyClassName?: string
  children: ReactNode
}

/**
 * 手机端 IM 布局：时间在信息框正上方，无头像列。
 */
export function MobileChatMessageGrid({
  side,
  time,
  bodyClassName = '',
  children,
}: MobileChatMessageGridProps) {
  const hasTime = Boolean(time)
  const bodyClass = ['chat-message__body-cell', 'chat-message__body', bodyClassName]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={`chat-message chat-message--${side} chat-message--time-only${
        hasTime ? '' : ' chat-message--no-time'
      }`}
    >
      <div className="chat-message__grid">
        <div className={bodyClass}>{children}</div>
      </div>
    </div>
  )
}
