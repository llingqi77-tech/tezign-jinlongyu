import { MobileAgentThread } from './MobileAgentThread'
import { MobileKpiDetailSheet } from './MobileKpiDetailSheet'
import { MobileQuickActions } from './MobileQuickActions'
import { MobileTaskListSheet } from './MobileTaskListSheet'

export function MobileAgentHome() {
  return (
    <div className="mobile-chat-page">
      <MobileAgentThread />
      <footer className="mobile-chat-footer">
        <MobileQuickActions />
      </footer>
      <MobileKpiDetailSheet />
      <MobileTaskListSheet />
    </div>
  )
}
