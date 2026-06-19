import { useShortageStore } from '../../../store/shortageStore'
import { MobileAgentHome } from './MobileAgentHome'
import { MobileProcurementSkuPage } from './MobileProcurementSkuPage'
import { MobileQuickActions } from './MobileQuickActions'
import { MobileSalesHistoryPage } from './MobileSalesHistoryPage'

export function MobileWorkbenchContent() {
  const procurementActiveSku = useShortageStore((s) => s.procurementActiveSku)
  const salesHistoryOpen = useShortageStore((s) => s.salesHistoryOpen)
  const procurementOverviewOpen = useShortageStore((s) => s.procurementOverviewOpen)
  const role = useShortageStore((s) => s.role)

  if (procurementActiveSku) return <MobileProcurementSkuPage sku={procurementActiveSku} />
  if (role === 'sales' && salesHistoryOpen) return <MobileSalesHistoryPage />
  if (role === 'procurement' && procurementOverviewOpen) {
    return (
      <div className="mobile-chat-page mobile-chat-page--procurement-overview">
        <MobileSalesHistoryPage />
        <footer className="mobile-chat-footer">
          <MobileQuickActions />
        </footer>
      </div>
    )
  }
  // 运营进入即落地到「履约数据总览」整页
  if (role === 'ops') return <MobileSalesHistoryPage />
  return <MobileAgentHome />
}
