import { useShortageStore } from '../../../store/shortageStore'
import { MobileAgentHome } from './MobileAgentHome'
import { MobileProcurementSkuPage } from './MobileProcurementSkuPage'
import { MobileRolePickScreen } from './MobileRolePickScreen'
import { MobileSalesHistoryPage } from './MobileSalesHistoryPage'

export function MobileWorkbenchContent() {
  const phase = useShortageStore((s) => s.mobileOnboardingPhase)
  const procurementActiveSku = useShortageStore((s) => s.procurementActiveSku)
  const salesHistoryOpen = useShortageStore((s) => s.salesHistoryOpen)
  const procurementOverviewOpen = useShortageStore((s) => s.procurementOverviewOpen)
  const role = useShortageStore((s) => s.role)

  if (phase === 'role_pick') return <MobileRolePickScreen />
  if (procurementActiveSku) return <MobileProcurementSkuPage sku={procurementActiveSku} />
  if (role === 'sales' && salesHistoryOpen) return <MobileSalesHistoryPage />
  if (role === 'procurement' && procurementOverviewOpen) return <MobileSalesHistoryPage />
  // 运营进入即落地到「履约数据总览」整页
  if (role === 'ops') return <MobileSalesHistoryPage />
  return <MobileAgentHome />
}
