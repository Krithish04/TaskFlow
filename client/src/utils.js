export function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000)    return 'just now'
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function isOverdue(d, status) {
  if (!d || status === 'Completed') return false
  return new Date(d) < new Date()
}

export function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function priorityClass(p) {
  return { High: 'tag-high', Medium: 'tag-medium', Low: 'tag-low' }[p] || ''
}

export function statusClass(s) {
  return { Pending: 'tag-pending', 'In Progress': 'tag-progress', Completed: 'tag-done' }[s] || ''
}

export function roleClass(r) {
  return { Admin: 'badge-admin', PM: 'badge-pm', User: 'badge-user' }[r] || ''
}
