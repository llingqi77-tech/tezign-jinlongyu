export function ErpBackground() {
  return (
    <div className="erp-background flex h-full min-h-0 flex-col">
      <header className="erp-header">
        <span className="erp-header__brand">
          <span className="erp-header__mark" aria-hidden />
          易分销 Plus
        </span>
        <nav className="erp-header__nav">
          <span className="erp-header__nav-item erp-header__nav-item--active">订单管理</span>
          <span className="erp-header__nav-item">库存查询</span>
          <span className="erp-header__nav-item">客户档案</span>
          <span className="erp-header__nav-item">报表中心</span>
        </nav>
      </header>
      <div className="flex min-h-0 flex-1 flex-col bg-canvas-warm p-6">
        <h1 className="mb-4 text-subheading font-semibold tracking-tight text-ink">销售订单列表</h1>
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-tech bg-white shadow-card">
          <table className="w-full text-left text-body text-ink">
            <thead className="erp-table-head border-b border-tech">
              <tr>
                <th className="px-4 py-3 font-data text-caption font-medium uppercase tracking-wide text-muted">
                  订单号
                </th>
                <th className="px-4 py-3 text-caption font-medium uppercase tracking-wide text-muted">
                  客户
                </th>
                <th className="px-4 py-3 text-caption font-medium uppercase tracking-wide text-muted">
                  金额
                </th>
                <th className="px-4 py-3 text-caption font-medium uppercase tracking-wide text-muted">
                  状态
                </th>
              </tr>
            </thead>
            <tbody>
              {['SO-10021', 'SO-10022', 'SO-10023', 'SO-10024'].map((id, i) => (
                <tr
                  key={id}
                  className="border-b border-tech transition-colors last:border-0 hover:bg-brand-light/30"
                >
                  <td className="px-4 py-3 font-data text-caption text-brand-dark">{id}</td>
                  <td className="px-4 py-3">酒店客户 {i + 1}</td>
                  <td className="px-4 py-3 font-medium">¥{(12000 + i * 3400).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-brand-muted px-2 py-0.5 text-caption font-medium text-brand-dark">
                      已审核
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
