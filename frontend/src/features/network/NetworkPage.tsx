import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError, getUser } from '../../lib/api'
import type { ConnectionRequest, ConnectionStatus, ConnectionSummary, User } from '../../lib/types'
import { ConnectButton } from './ConnectButton'
import { li } from './linkedinTheme'
import { MyProfileCard } from './MyProfileCard'
import { SuggestionsRail } from './SuggestionsRail'

type Tab = 'discover' | 'connections' | 'requests'

function UserCard({ user, children }: { user: User; children?: React.ReactNode }) {
  return (
    <div className={`${li.card} overflow-hidden group flex flex-col`}>
      <div className="h-16 bg-gradient-to-r from-[#8FA8C7] to-[#6E93BE] relative">
        <div className="absolute -bottom-7 left-5 w-14 h-14 bg-white rounded-full flex items-center justify-center text-xl shadow border-2 border-white text-[#0A66C2] font-bold">
          {user.full_name.charAt(0).toUpperCase()}
        </div>
      </div>

      <div className="pt-9 px-5 pb-5 flex-1 flex flex-col">
        <h2 className="font-semibold text-black/90 mb-0.5">
          <Link to={`/users/${user.id}`} className="hover:underline">
            {user.full_name}
          </Link>
        </h2>
        <p className="text-sm text-black/50 mb-3 line-clamp-2">
          {user.headline || user.bio || user.domain || 'Open to Opportunities'}
        </p>
        {children}
      </div>
    </div>
  )
}

export default function NetworkPage() {
  const me = getUser()
  const [tab, setTab] = useState<Tab>('discover')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    api<ConnectionRequest[]>('/api/connections/pending').then((r) => setPendingCount(r.length)).catch(() => {})
  }, [])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'discover', label: 'Discover' },
    { key: 'connections', label: 'My Connections' },
    { key: 'requests', label: `Requests${pendingCount ? ` (${pendingCount})` : ''}` },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] gap-6 items-start">
      <div className="hidden lg:block sticky top-20">
        <MyProfileCard />
      </div>

      <div className="min-w-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1 text-black/90">Campus Network</h1>
          <p className="text-black/60">Find, connect, and grow your network across campus.</p>
        </div>

        <div className="flex gap-2 mb-6 border-b border-black/10">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                tab === t.key ? 'border-[#0A66C2] text-[#0A66C2]' : 'border-transparent text-black/50 hover:text-black/80'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'discover' && <DiscoverTab myId={me?.id} />}
        {tab === 'connections' && <ConnectionsTab />}
        {tab === 'requests' && <RequestsTab onCountChange={setPendingCount} />}
      </div>

      <div className="hidden lg:block sticky top-20">
        <SuggestionsRail />
      </div>
    </div>
  )
}

function DiscoverTab({ myId }: { myId?: number }) {
  const [users, setUsers] = useState<User[]>([])
  const [statusMap, setStatusMap] = useState<Record<number, { status: ConnectionStatus; connectionId: number | null }>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    Promise.all([
      api<User[]>('/api/auth/users'),
      api<ConnectionSummary[]>('/api/connections/mine'),
    ])
      .then(([userList, connections]) => {
        setUsers(userList)
        const map: Record<number, { status: ConnectionStatus; connectionId: number | null }> = {}
        for (const c of connections) {
          const status: ConnectionStatus =
            c.status === 'accepted' ? 'connected' : c.is_requester ? 'pending_outgoing' : 'pending_incoming'
          map[c.other_user_id] = { status, connectionId: c.connection_id }
        }
        setStatusMap(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function updateStatus(userId: number, status: ConnectionStatus, connectionId: number | null) {
    setStatusMap((prev) => ({ ...prev, [userId]: { status, connectionId } }))
  }

  const filteredUsers = users
    .filter((u) => u.id !== myId)
    .filter((u) => {
      const term = filter.toLowerCase()
      return (
        u.full_name.toLowerCase().includes(term) ||
        (u.domain && u.domain.toLowerCase().includes(term)) ||
        (u.headline && u.headline.toLowerCase().includes(term))
      )
    })

  if (loading) return <div className="p-8 text-center text-black/50">Loading network...</div>

  return (
    <div>
      <div className="flex justify-end mb-6">
        <input
          type="text"
          placeholder="Search by name or domain..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={`${li.input} w-full md:w-64`}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {filteredUsers.map((u) => {
          const entry = statusMap[u.id] || { status: 'none' as ConnectionStatus, connectionId: null }
          return (
            <UserCard key={u.id} user={u}>
              <div className="mt-auto pt-3 border-t border-black/10 flex items-center justify-between gap-3">
                <div className="flex gap-3">
                  {u.linkedin_url && (
                    <a href={u.linkedin_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-black/50 hover:text-[#0A66C2] transition">
                      LinkedIn ↗
                    </a>
                  )}
                  {u.github_url && (
                    <a href={u.github_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-black/50 hover:text-black/90 transition">
                      GitHub ↗
                    </a>
                  )}
                </div>
                <ConnectButton
                  userId={u.id}
                  status={entry.status}
                  connectionId={entry.connectionId}
                  onChange={(status, connectionId) => updateStatus(u.id, status, connectionId)}
                />
              </div>
            </UserCard>
          )
        })}
        {filteredUsers.length === 0 && (
          <div className={`col-span-full py-12 text-center text-black/50 ${li.card}`}>
            No users found matching your search.
          </div>
        )}
      </div>
    </div>
  )
}

function ConnectionsTab() {
  const [connections, setConnections] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<User[]>('/api/connections').then(setConnections).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-black/50">Loading connections...</div>

  if (connections.length === 0) {
    return (
      <div className={`py-12 text-center text-black/50 ${li.card}`}>
        No connections yet. Head to Discover to start connecting.
      </div>
    )
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {connections.map((u) => (
        <UserCard key={u.id} user={u}>
          <div className="mt-auto pt-3 border-t border-black/10">
            <Link to={`/users/${u.id}`} className={li.ghostLink}>
              View profile
            </Link>
          </div>
        </UserCard>
      ))}
    </div>
  )
}

function RequestsTab({ onCountChange }: { onCountChange: (n: number) => void }) {
  const [requests, setRequests] = useState<ConnectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    api<ConnectionRequest[]>('/api/connections/pending')
      .then((r) => {
        setRequests(r)
        onCountChange(r.length)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    // onCountChange is stable enough for a mount-only fetch; omit from deps to avoid refetch loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function respond(request: ConnectionRequest, accept: boolean) {
    setBusyId(request.id)
    try {
      await api(`/api/connections/${request.id}${accept ? '/accept' : ''}`, { method: accept ? 'PUT' : 'DELETE' })
      const next = requests.filter((r) => r.id !== request.id)
      setRequests(next)
      onCountChange(next.length)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to update request')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <div className="p-8 text-center text-black/50">Loading requests...</div>

  if (requests.length === 0) {
    return (
      <div className={`py-12 text-center text-black/50 ${li.card}`}>
        No pending connection requests.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <div key={r.id} className={`${li.card} p-4 flex items-center justify-between gap-4`}>
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 shrink-0 bg-black/5 rounded-full flex items-center justify-center text-lg font-bold text-[#0A66C2]">
              {r.user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <Link to={`/users/${r.user.id}`} className="font-semibold text-black/90 hover:underline">
                {r.user.full_name}
              </Link>
              <p className="text-sm text-black/50 truncate">{r.user.headline || r.user.domain || 'wants to connect'}</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => respond(r, true)} disabled={busyId === r.id} className={li.primaryBtn}>
              Accept
            </button>
            <button onClick={() => respond(r, false)} disabled={busyId === r.id} className={li.outlineBtn}>
              Ignore
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
