import { useShortageStore } from '../../../store/shortageStore'
import type { MobileRoleViewTarget } from '../../../types/shortage'

const NAV_ITEMS: { id: MobileRoleViewTarget; label: string }[] = [
  { id: 'ops', label: '运营' },
  { id: 'sales', label: '销售' },
  { id: 'procurement', label: '采购' },
  { id: 'oa_approved', label: 'OA审批通过状态' },
  { id: 'oa_rejected', label: 'OA被驳回状态' },
]

export function MobileRoleSwitcherRail() {
  const activeView = useShortageStore((s) => s.mobileRoleView)
  const switchMobileRoleView = useShortageStore((s) => s.switchMobileRoleView)

  return (
    <nav className="mobile-role-switcher-rail" aria-label="角色切换">
      <p className="mobile-role-switcher-rail__title">切换视图</p>
      <ul className="mobile-role-switcher-rail__list">
        {NAV_ITEMS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`mobile-role-switcher-rail__btn${
                activeView === item.id ? ' mobile-role-switcher-rail__btn--active' : ''
              }`}
              aria-current={activeView === item.id ? 'page' : undefined}
              onClick={() => switchMobileRoleView(item.id)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
