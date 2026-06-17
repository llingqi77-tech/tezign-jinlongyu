import { useEffect, useState } from 'react'

const CHAR_MS = 22

type StreamingTextProps = {
  text: string
  active: boolean
  onComplete?: () => void
}

export function StreamingText({ text, active, onComplete }: StreamingTextProps) {
  const [visible, setVisible] = useState(active ? 0 : text.length)

  useEffect(() => {
    if (!active) {
      setVisible(text.length)
      return
    }
    setVisible(0)
  }, [text, active])

  useEffect(() => {
    if (!active || visible >= text.length) {
      if (active && visible >= text.length) onComplete?.()
      return
    }
    const timer = window.setTimeout(() => setVisible((n) => n + 1), CHAR_MS)
    return () => window.clearTimeout(timer)
  }, [active, text.length, visible, onComplete])

  return (
    <>
      {text.slice(0, visible)}
      {active && visible < text.length ? (
        <span className="streaming-text__cursor" aria-hidden>
          |
        </span>
      ) : null}
    </>
  )
}
