export default function StatCard({ label, value, type = 'total' }) {
  return (
    <div className={`stat-card ${type}`}>
      <div className="stat-label">{label}</div>
      <div className={`stat-num ${type}`}>{value ?? '—'}</div>
    </div>
  )
}
