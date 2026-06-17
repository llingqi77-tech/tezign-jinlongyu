import { useShortageStore } from '../../store/shortageStore'

export function AgentFab() {
  const openWorkbench = useShortageStore((s) => s.openWorkbench)

  return (
    <button
      type="button"
      onClick={openWorkbench}
      className="agent-fab fixed bottom-8 right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full text-sm transition-transform hover:scale-105 active:scale-95"
      aria-label="打开缺货履约 Agent"
    >
      AI
    </button>
  )
}
