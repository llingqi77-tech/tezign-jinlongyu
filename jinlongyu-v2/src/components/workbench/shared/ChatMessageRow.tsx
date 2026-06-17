import { StreamingText } from './StreamingText'
import { MobileChatMessageGrid } from '../mobile/MobileChatMessageGrid'
import type { MobileChatAction } from '../../../types/shortage'

type ChatMessageRowProps = {
  side: 'agent' | 'user'
  name: string
  time?: string
  content: string
  stream?: boolean
  showName?: boolean
  actions?: MobileChatAction[]
  onAction?: (message: string) => void
  onStreamComplete?: () => void
}

export function ChatMessageRow({
  side,
  name,
  time,
  content,
  stream = false,
  showName = true,
  actions,
  onAction,
  onStreamComplete,
}: ChatMessageRowProps) {
  const isUser = side === 'user'
  const timeOnly = !showName

  const bubbleBody = (
    <>
      <p>
        <StreamingText text={content} active={stream} onComplete={onStreamComplete} />
      </p>
      {actions && actions.length > 0 && onAction ? (
        <div className="chat-message__actions">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="chat-message__action-btn"
              onClick={() => onAction(action.message)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  )

  if (timeOnly) {
    return (
      <MobileChatMessageGrid side={side} time={time}>
        <div className={`chat-message__bubble chat-message__bubble--${side}`}>{bubbleBody}</div>
      </MobileChatMessageGrid>
    )
  }

  return (
    <div className={`chat-message chat-message--${side}`}>
      <div className="chat-message__row">
        <div
          className={`chat-message__avatar chat-message__avatar--${side}`}
          aria-hidden
        >
          {isUser ? '我' : 'AI'}
        </div>
        <div className="chat-message__body">
          {showName ? (
            <div className="chat-message__meta">
              <span className="chat-message__name">{name}</span>
              {time ? <span className="chat-message__time">{time}</span> : null}
            </div>
          ) : null}
          <div className={`chat-message__bubble chat-message__bubble--${side}`}>{bubbleBody}</div>
        </div>
      </div>
    </div>
  )
}
