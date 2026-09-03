import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getUser } from '../../lib/api'
import type { ConnectionStatus, ConnectionSummary, User } from '../../lib/types'
import { ConnectButton } from './ConnectButton'
import { li } from './linkedinTheme'

export function SuggestionsRail({ title = 'People you may know', excludeUserId, limit = 5 }: { title?: string; excludeUserId?: number; limit?: number }) {
  const me = getUser()
  const [suggestions, setSuggestions] = useState<{ user: User; status: ConnectionStatus; connectionId: number | null }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api<User[]>('/api/auth/users'), api<ConnectionSummary[]>('/api/connections/mine')])
      .then(([users, connections]) => {
        const connectedIds = new Set(connections.map((c) => c.other_user_id))
        const list = users
          .filter((u) => u.id !== me?.id && u.id !== excludeUserId && !connectedIds.has(u.id))
          .slice(0, limit)
          .map((user) => ({ user, status: 'none' as ConnectionStatus, connectionId: null }))
        setSuggestions(list)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    // Deliberately runs once per mount - excludeUserId changes (e.g. navigating
    // between profiles) are rare enough that a stale list for a moment is fine,
    // and refetching on every render would be wasteful.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateStatus(userId: number, status: ConnectionStatus, connectionId: number | null) {
    if (status !== 'none') {
      // Once acted on, it's no longer a "suggestion" - drop it from the rail.
      setSuggestions((prev) => prev.filter((s) => s.user.id !== userId))
      return
    }
    setSuggestions((prev) => prev.map((s) => (s.user.id === userId ? { ...s, status, connectionId } : s)))
  }

  if (loading || suggestions.length === 0) return null

  return (
    <div className={li.card}>
      <h2 className="font-semibold text-black/90 px-4 pt-4 pb-2">{title}</h2>
      <div className="divide-y divide-black/10">
        {suggestions.map(({ user, status, connectionId }) => (
          <div key={user.id} className="p-4 flex items-start gap-3">
            <Link to={`/users/${user.id}`} className="shrink-0">
              <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center text-lg font-bold text-[#0A66C2]">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
            </Link>
            <div className="min-w-0 flex-1">
              <Link to={`/users/${user.id}`} className="font-medium text-sm text-black/90 hover:underline block truncate">
                {user.full_name}
              </Link>
              <p className="text-xs text-black/50 truncate mb-2">{user.headline || user.domain || 'Open to Opportunities'}</p>
              <ConnectButton userId={user.id} status={status} connectionId={connectionId} onChange={(s, id) => updateStatus(user.id, s, id)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
