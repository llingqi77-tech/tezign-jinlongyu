import type { KeyboardEvent } from 'react'

type AgentComposerProps = {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  placeholder?: string
  className?: string
}

export function AgentComposer({
  value,
  onChange,
  onSend,
  placeholder,
  className = '',
}: AgentComposerProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSend()
  }

  return (
    <div className={`agent-composer ${className}`.trim()}>
      <div className="agent-composer__box">
        <input
          type="text"
          className="agent-composer__input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="agent-composer__send"
          onClick={onSend}
          disabled={!value.trim()}
          aria-label="发送"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 12h12M13 7l5 5-5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
