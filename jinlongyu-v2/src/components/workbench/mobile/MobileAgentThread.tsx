import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import { sendMobileAgentMessage } from '../../../utils/mobileAgentDialogue'
import { ChatMessageRow } from '../shared/ChatMessageRow'
import { StreamingText } from '../shared/StreamingText'
import { MobileChatMessageGrid } from './MobileChatMessageGrid'
import { MobileOrderInfoCard } from './MobileOrderInfoCard'
import { MobileFulfillmentDataPanel } from './MobileFulfillmentDataPanel'
import { MobileProcurementCardList } from './MobileProcurementCardList'
import { MobileSalesHotelDataPanel } from './MobileSalesHotelDataPanel'

export function MobileAgentThread() {
  const messages = useShortageStore((s) => s.mobileChatMessages)
  const scrollToTopNonce = useShortageStore((s) => s.mobileChatScrollToTopNonce)
  const threadRef = useRef<HTMLDivElement>(null)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const prevCountRef = useRef(0)
  const scrollMessageCountRef = useRef(messages.length)
  const prevScrollToTopNonceRef = useRef(scrollToTopNonce)
  const setMobileChatScrollTop = useShortageStore((s) => s.setMobileChatScrollTop)

  useLayoutEffect(() => {
    const el = threadRef.current
    if (!el) return
    const { mobileChatRestoreScrollOnNextMount, mobileChatScrollTop } =
      useShortageStore.getState()
    if (!mobileChatRestoreScrollOnNextMount) return
    const restore = () => {
      el.scrollTop = mobileChatScrollTop
    }
    restore()
    requestAnimationFrame(restore)
    useShortageStore.setState({ mobileChatRestoreScrollOnNextMount: false })
  }, [])

  useEffect(() => {
    const el = threadRef.current
    if (!el) return
    const onScroll = () => setMobileChatScrollTop(el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [setMobileChatScrollTop])

  useEffect(() => {
    const el = threadRef.current
    if (!el) return

    const prevLen = scrollMessageCountRef.current
    const messageAdded = messages.length > prevLen
    scrollMessageCountRef.current = messages.length
    if (!messageAdded) return
    if (useShortageStore.getState().mobileChatRestoreScrollOnNextMount) return

    const role = useShortageStore.getState().role
    const welcomeOnly =
      role !== 'procurement' &&
      messages.length === 1 &&
      messages[0]?.kind === 'welcome_card' &&
      messages[0]?.side === 'agent'
    const defaultEntryPanel =
      messages.length === 1 &&
      messages[0]?.side === 'agent' &&
      (messages[0]?.kind === 'sales_hotel_data_panel' ||
        messages[0]?.kind === 'fulfillment_data_panel')
    el.scrollTop = welcomeOnly || defaultEntryPanel ? 0 : el.scrollHeight
  }, [messages, streamingId])

  useEffect(() => {
    if (scrollToTopNonce === prevScrollToTopNonceRef.current) return
    prevScrollToTopNonceRef.current = scrollToTopNonce
    const el = threadRef.current
    if (!el || scrollToTopNonce === 0) return
    el.scrollTo({ top: 0, behavior: 'smooth' })
  }, [scrollToTopNonce])

  useEffect(() => {
    if (messages.length <= prevCountRef.current) {
      prevCountRef.current = messages.length
      return
    }
    const added = messages.slice(prevCountRef.current)
    prevCountRef.current = messages.length
    const lastAgent = [...added].reverse().find((m) => m.side === 'agent')
    if (lastAgent) setStreamingId(lastAgent.id)
  }, [messages])

  return (
    <div className="mobile-chat-thread" ref={threadRef}>
      {messages.map((msg) => {
        if (msg.kind === 'welcome_card' && msg.side === 'agent') {
          return (
            <MobileChatMessageGrid key={msg.id} side="agent" time={msg.timestamp}>
              <div className="chat-message__bubble chat-message__bubble--agent chat-message__bubble--card">
                <MobileProcurementCardList />
              </div>
            </MobileChatMessageGrid>
          )
        }

        if (msg.kind === 'sales_hotel_data_panel' && msg.side === 'agent' && msg.meta?.salesHotelPanel) {
          return (
            <MobileChatMessageGrid key={msg.id} side="agent" time={msg.timestamp}>
              <div className="chat-message__bubble chat-message__bubble--agent chat-message__bubble--card">
                {msg.content ? (
                  <p className="mobile-sales-hotel-panel__intro">
                    <StreamingText
                      text={msg.content}
                      active={msg.id === streamingId}
                      onComplete={() => {
                        if (msg.id === streamingId) setStreamingId(null)
                      }}
                    />
                  </p>
                ) : null}
                <MobileSalesHotelDataPanel panel={msg.meta.salesHotelPanel} />
              </div>
            </MobileChatMessageGrid>
          )
        }

        if (
          msg.kind === 'procurement_task_list_panel' &&
          msg.side === 'agent' &&
          msg.meta?.procurementListSort
        ) {
          return (
            <MobileChatMessageGrid key={msg.id} side="agent" time={msg.timestamp}>
              <div className="chat-message__bubble chat-message__bubble--agent chat-message__bubble--card">
                {msg.content ? (
                  <p className="mobile-procurement-task-panel__intro">
                    <StreamingText
                      text={msg.content}
                      active={msg.id === streamingId}
                      onComplete={() => {
                        if (msg.id === streamingId) setStreamingId(null)
                      }}
                    />
                  </p>
                ) : null}
                <MobileProcurementCardList sortOverride={msg.meta.procurementListSort} />
              </div>
            </MobileChatMessageGrid>
          )
        }

        if (msg.kind === 'fulfillment_data_panel' && msg.side === 'agent' && msg.meta?.fulfillmentPanel) {
          return (
            <MobileChatMessageGrid key={msg.id} side="agent" time={msg.timestamp}>
              <div className="chat-message__bubble chat-message__bubble--agent chat-message__bubble--card">
                {msg.content ? (
                  <p className="mobile-fulfillment-panel__intro">
                    <StreamingText
                      text={msg.content}
                      active={msg.id === streamingId}
                      onComplete={() => {
                        if (msg.id === streamingId) setStreamingId(null)
                      }}
                    />
                  </p>
                ) : null}
                <MobileFulfillmentDataPanel panel={msg.meta.fulfillmentPanel} />
              </div>
            </MobileChatMessageGrid>
          )
        }

        if (msg.kind === 'order_info' && msg.side === 'agent') {
          return (
            <MobileChatMessageGrid key={msg.id} side="agent">
              <MobileOrderInfoCard
                details={msg.meta?.orderDetails ?? []}
                progress={msg.meta?.taskProgress}
                taskIndex={msg.meta?.taskIndex}
                fulfillmentMethodLabel={msg.meta?.fulfillmentMethodLabel}
                fulfillmentFieldLabel={msg.meta?.fulfillmentFieldLabel}
                fulfillmentDetail={msg.meta?.fulfillmentDetail}
                completed={msg.meta?.orderStatus === 'completed'}
              />
            </MobileChatMessageGrid>
          )
        }

        const isUser = msg.side === 'user'
        return (
          <ChatMessageRow
            key={msg.id}
            side={isUser ? 'user' : 'agent'}
            name=""
            showName={false}
            time={msg.timestamp}
            content={msg.content}
            actions={!isUser ? msg.meta?.actions : undefined}
            onAction={sendMobileAgentMessage}
            stream={
              !isUser &&
              msg.id === streamingId &&
              msg.kind !== 'welcome_card' &&
              msg.kind !== 'order_info' &&
              msg.kind !== 'fulfillment_data_panel' &&
              msg.kind !== 'sales_hotel_data_panel' &&
              msg.kind !== 'procurement_task_list_panel'
            }
            onStreamComplete={() => {
              if (msg.id === streamingId) setStreamingId(null)
            }}
          />
        )
      })}
    </div>
  )
}
