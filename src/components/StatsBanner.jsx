export default function StatsBanner({ stats, loading }) {
  if (loading) {
    return (
      <div className="stats-banner stats-banner-loading">
        <div className="stats-item skeleton-text">Loading society stats...</div>
      </div>
    )
  }

  const resolved = stats?.resolved ?? 0
  const open = stats?.open ?? 0
  const avgFixDays = stats?.avg_fix_days !== undefined ? stats.avg_fix_days : 0

  return (
    <div className="stats-banner">
      <div className="stats-col">
        <span className="stats-value stats-resolved">{resolved}</span>
        <span className="stats-label">Resolved</span>
      </div>
      <div className="stats-divider" />
      <div className="stats-col">
        <span className="stats-value stats-open">{open}</span>
        <span className="stats-label">Open</span>
      </div>
      <div className="stats-divider" />
      <div className="stats-col">
        <span className="stats-value stats-avg">
          {typeof avgFixDays === 'number' ? avgFixDays.toFixed(1) : avgFixDays}d
        </span>
        <span className="stats-label">Avg Fix</span>
      </div>
    </div>
  )
}
