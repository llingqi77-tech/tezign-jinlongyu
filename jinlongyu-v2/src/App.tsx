import { useEffect } from 'react'
import { WorkbenchModal } from './components/workbench/WorkbenchModal'
import { WorkbenchShell } from './components/workbench/WorkbenchShell'
import { syncPlatformMobileClass } from './hooks/useIsMobile'
import { useShortageStore } from './store/shortageStore'

function App() {
  const workbenchOpen = useShortageStore((s) => s.workbenchOpen)
  const openWorkbench = useShortageStore((s) => s.openWorkbench)

  useEffect(() => {
    syncPlatformMobileClass(true)
  }, [])

  useEffect(() => {
    if (!workbenchOpen) {
      openWorkbench()
    }
  }, [workbenchOpen, openWorkbench])

  return (
    <WorkbenchModal>
      <WorkbenchShell />
    </WorkbenchModal>
  )
}

export default App
