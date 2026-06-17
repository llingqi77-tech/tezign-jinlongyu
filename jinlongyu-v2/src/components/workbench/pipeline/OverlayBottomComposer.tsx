import { useState } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import { AgentComposer } from '../shared/AgentComposer'

export function OverlayBottomComposer({ placeholder }: { placeholder?: string }) {
  const pushActivity = useShortageStore((s) => s.pushActivity)
  const [input, setInput] = useState('')

  const submit = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    pushActivity({ actor: '我', type: 'system', content: trimmed })
    pushActivity({
      actor: 'Agent',
      type: 'system',
      content:
        '已收到。我可以帮您查看今日同步进度、各阶段待办或本周签收情况；也可继续说明具体 PO / 酒店需求（演示）。',
    })
    setInput('')
  }

  return (
    <AgentComposer
      className="agent-composer--overlay"
      value={input}
      onChange={setInput}
      onSend={submit}
      placeholder={placeholder ?? '输入您的问题…'}
    />
  )
}
