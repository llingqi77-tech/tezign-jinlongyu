import type { ReactNode } from 'react'
import { MobileChatMessageGrid } from './MobileChatMessageGrid'

type MobileChatMessageLayoutProps = {
  side: 'agent' | 'user'
  time?: string
  bodyClassName?: string
  children: ReactNode
}

export function MobileChatMessageLayout({
  side,
  time,
  bodyClassName = '',
  children,
}: MobileChatMessageLayoutProps) {
  return (
    <MobileChatMessageGrid side={side} time={time} bodyClassName={bodyClassName}>
      {children}
    </MobileChatMessageGrid>
  )
}
