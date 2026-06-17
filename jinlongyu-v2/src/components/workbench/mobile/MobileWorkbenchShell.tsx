import { useShortageStore } from '../../../store/shortageStore'
import { ROLE_LABEL } from '../../../utils/mobileAgentSummary'
import { MobileWorkbenchContent } from './MobileWorkbenchContent'

export function MobileWorkbenchShell() {
  const role = useShortageStore((s) => s.role)
  const phase = useShortageStore((s) => s.mobileOnboardingPhase)
  const procurementActiveSku = useShortageStore((s) => s.procurementActiveSku)
  const salesHistoryOpen = useShortageStore((s) => s.salesHistoryOpen)
  const procurementOverviewOpen = useShortageStore((s) => s.procurementOverviewOpen)
  const closeWorkbench = useShortageStore((s) => s.closeWorkbench)
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const showChatHeader =
    phase === 'ready' &&
    !procurementActiveSku &&
    !salesHistoryOpen &&
    !procurementOverviewOpen &&
    role !== 'ops'

  return (
    <>
      {showChatHeader ? (
        <header className="mobile-workbench-header">
          <div className="mobile-workbench-header__top">
            <button
              type="button"
              onClick={closeWorkbench}
              className="mobile-workbench-header__back"
              aria-label="返回"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M15 6l-6 6 6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="mobile-workbench-header__brand">
              <div className="mobile-workbench-header__text">
                <h1 className="mobile-workbench-header__title">智能履约助手</h1>
                <p className="mobile-workbench-header__meta">
                  {ROLE_LABEL[role]} · {today}
                </p>
              </div>
            </div>
          </div>
        </header>
      ) : null}
      <main className="workbench-main">
        <MobileWorkbenchContent />
      </main>
    </>
  )
}
