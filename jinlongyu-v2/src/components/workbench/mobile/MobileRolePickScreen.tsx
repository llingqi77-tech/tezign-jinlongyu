import { useShortageStore } from '../../../store/shortageStore'
import type { ProcurementOaPreviewOutcome, WorkbenchRole } from '../../../types/shortage'

const ROLES: { id: WorkbenchRole; label: string; desc: string; icon: string }[] = [
  { id: 'ops', label: '运营', desc: '掌握全链路缺货与各环节进度', icon: '📊' },
  { id: 'sales', label: '销售', desc: '确认客户履约方式并推动闭环', icon: '🤝' },
  { id: 'procurement', label: '采购', desc: '提供履约建议与紧急寻源', icon: '📦' },
]

export function MobileRolePickScreen() {
  const setRole = useShortageStore((s) => s.setRole)
  const finishMobileActivation = useShortageStore((s) => s.finishMobileActivation)
  const enterProcurementOaNotifyPreview = useShortageStore((s) => s.enterProcurementOaNotifyPreview)
  const closeWorkbench = useShortageStore((s) => s.closeWorkbench)

  const pick = (role: WorkbenchRole) => {
    setRole(role)
    finishMobileActivation()
  }

  const pickOaPreview = (outcome: ProcurementOaPreviewOutcome) => {
    enterProcurementOaNotifyPreview(outcome)
  }

  return (
    <div className="mobile-role-pick">
      <button
        type="button"
        className="mobile-role-pick__close"
        onClick={closeWorkbench}
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
        <span className="mobile-role-pick__close-label">返回</span>
      </button>

      <section className="mobile-role-pick__panel" aria-labelledby="mobile-role-pick-title">
        <div className="mobile-role-pick__content">
          <p className="mobile-role-pick__greeting">你好～</p>
          <h1 className="mobile-role-pick__headline">我是智能履约助手</h1>
          <div className="mobile-role-pick__panel-head">
            <div>
              <h2 id="mobile-role-pick-title" className="mobile-role-pick__panel-title">
                选择你的角色
              </h2>
              <p className="mobile-role-pick__panel-kicker">为你匹配工作视图</p>
            </div>
          </div>
          <ul className="mobile-role-pick__list">
            {ROLES.map((r) => (
              <li key={r.id}>
                <button type="button" className="mobile-role-pick__card" onClick={() => pick(r.id)}>
                  <span className="mobile-role-pick__icon" aria-hidden>
                    {r.icon}
                  </span>
                  <span className="mobile-role-pick__body">
                    <span className="mobile-role-pick__label">{r.label}</span>
                    <span className="mobile-role-pick__desc">{r.desc}</span>
                  </span>
                  <span className="mobile-role-pick__arrow" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
            ))}
            <li className="mobile-role-pick__preview-item">
              <button
                type="button"
                className="mobile-role-pick__card mobile-role-pick__card--preview"
                onClick={() => pickOaPreview('approved')}
              >
                <span className="mobile-role-pick__icon" aria-hidden>
                  🔔
                </span>
                <span className="mobile-role-pick__body">
                  <span className="mobile-role-pick__label">OA提醒通知</span>
                  <span className="mobile-role-pick__desc">采购收到 OA 结果后的填写页预览</span>
                </span>
                <span className="mobile-role-pick__arrow" aria-hidden>
                  ›
                </span>
              </button>
              <button
                type="button"
                className="mobile-role-pick__oa-alt"
                onClick={() => pickOaPreview('rejected')}
              >
                预览 OA 驳回场景
              </button>
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}
