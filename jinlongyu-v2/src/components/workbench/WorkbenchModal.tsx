import type { ReactNode } from 'react'
import { useShortageStore } from '../../store/shortageStore'
import { MobileRoleSwitcherRail } from './mobile/MobileRoleSwitcherRail'

export function WorkbenchModal({ children }: { children: ReactNode }) {
  const open = useShortageStore((s) => s.workbenchOpen)
  const closeWorkbench = useShortageStore((s) => s.closeWorkbench)
  const toast = useShortageStore((s) => s.toast)

  if (!open) return null

  return (
    <div className="workbench-overlay workbench-overlay--fullscreen fixed inset-0 z-50 flex flex-col">
      <div className="workbench-overlay__mobile-stage">
        <MobileRoleSwitcherRail />
        <div className="workbench-modal relative flex h-full w-full max-w-none flex-col overflow-hidden rounded-none">
          {toast && (
            <div className="absolute left-1/2 top-6 z-[60] -translate-x-1/2 rounded-full bg-fire-orange px-5 py-2 text-caption font-medium text-white shadow-xl-2">
              {toast}
            </div>
          )}
          {children}
        </div>
      </div>
      <button
        type="button"
        className="absolute inset-0 -z-10 cursor-default"
        aria-label="关闭"
        onClick={closeWorkbench}
      />
    </div>
  )
}
