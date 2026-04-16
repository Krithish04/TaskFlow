import { initials } from '../../utils'

export default function Avatar({ user, size = 'md', className = '' }) {
  const sz = { sm: 'ava-sm', md: 'ava-md', lg: 'ava-lg', xl: 'ava-xl' }[size]
  return (
    <div
      className={`ava ${sz} ${className}`}
      style={{ background: user?.color || '#7c6dfa', color: '#fff' }}
      title={user?.name}
    >
      {initials(user?.name || '?')}
    </div>
  )
}
