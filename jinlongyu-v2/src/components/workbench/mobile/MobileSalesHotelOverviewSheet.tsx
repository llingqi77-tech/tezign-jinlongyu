import { useShortageStore } from '../../../store/shortageStore'
import { MobileSalesHotelOverview } from './MobileSalesHotelOverview'

export function MobileSalesHotelOverviewSheet() {
  const open = useShortageStore((s) => s.mobileSalesHotelOverviewOpen)
  const close = useShortageStore((s) => s.closeMobileSalesHotelOverview)

  if (!open) return null

  return (
    <div
      className="mobile-sheet mobile-sales-hotel-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="按酒店数据总览"
    >
      <button type="button" className="mobile-sheet__backdrop" onClick={close} aria-label="关闭" />
      <div className="mobile-sheet__panel mobile-sheet__panel--tall">
        <header className="mobile-sheet__header">
          <h2 className="mobile-sheet__title">按酒店数据总览</h2>
          <button type="button" className="mobile-sheet__close" onClick={close} aria-label="关闭">
            ✕
          </button>
        </header>
        <div className="mobile-sheet__body mobile-sales-hotel-sheet__body">
          <MobileSalesHotelOverview />
        </div>
      </div>
    </div>
  )
}
