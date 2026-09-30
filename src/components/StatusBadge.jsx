export default function StatusBadge({ status }) {
  const statusLabels = {
    submitted: 'Submitted',
    acknowledged: 'Acknowledged',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    rejected: 'Rejected',
  }

  const label = statusLabels[status] || status || 'Submitted'
  const normalizedStatus = status || 'submitted'

  return (
    <span className={`badge status-badge status-${normalizedStatus}`}>
      {label}
    </span>
  )
}
