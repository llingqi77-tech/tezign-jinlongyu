import { useState } from 'react'
import { sendMobileAgentMessage } from '../../../utils/mobileAgentDialogue'
import { AgentComposer } from '../shared/AgentComposer'

export function MobileAgentComposer() {
  const [input, setInput] = useState('')

  const send = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    setInput('')
    sendMobileAgentMessage(trimmed)
  }

  return (
    <AgentComposer
      className="agent-composer--mobile"
      value={input}
      onChange={setInput}
      onSend={() => send()}
      placeholder="向履约 Agent 提问或描述任务…"
    />
  )
}
