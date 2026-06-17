import { useEffect, useRef, useState } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import { ChatMessageRow } from '../shared/ChatMessageRow'
import { OverlayBottomComposer } from './OverlayBottomComposer'

const WELCOME =
  '您好，我是运营履约助手。您可以询问今日同步、各阶段进度或签收情况；也可在下方输入继续说明。'

export function OpsChatConversation() {
  const events = useShortageStore((s) => s.activityEvents)
  const threadRef = useRef<HTMLDivElement>(null)
  const [welcomeDone, setWelcomeDone] = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const prevCountRef = useRef(0)

  useEffect(() => {
    const el = threadRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [events, streamingId, welcomeDone])

  useEffect(() => {
    if (events.length <= prevCountRef.current) {
      prevCountRef.current = events.length
      return
    }
    const added = events.slice(prevCountRef.current)
    prevCountRef.current = events.length
    const lastAgent = [...added].reverse().find((e) => e.actor !== '我')
    if (lastAgent) setStreamingId(lastAgent.id)
  }, [events])

  return (
    <div className="ops-chat-conversation">
      <div className="ops-chat-conversation__thread" ref={threadRef}>
        <ChatMessageRow
          side="agent"
          name="履约 Agent"
          content={WELCOME}
          stream={!welcomeDone}
          onStreamComplete={() => setWelcomeDone(true)}
        />
        {events.map((ev) => {
          const isUser = ev.actor === '我'
          return (
            <ChatMessageRow
              key={ev.id}
              side={isUser ? 'user' : 'agent'}
              name={isUser ? '我' : '履约 Agent'}
              time={ev.timestamp}
              content={ev.content}
              stream={!isUser && ev.id === streamingId}
              onStreamComplete={() => {
                if (ev.id === streamingId) setStreamingId(null)
              }}
            />
          )
        })}
      </div>
      <OverlayBottomComposer placeholder="输入您的问题…" />
    </div>
  )
}
