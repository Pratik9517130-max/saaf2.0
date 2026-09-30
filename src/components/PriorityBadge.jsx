export default function PriorityBadge({ priority }) {
  const priorityLabels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  }

  const label = priorityLabels[priority] || priority || 'Medium'
  const normalizedPriority = priority || 'medium'

  return (
    <span className={`badge priority-badge priority-${normalizedPriority}`}>
      {label}
    </span>
  )
}
