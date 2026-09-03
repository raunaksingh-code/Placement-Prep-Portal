import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api, ApiError, getUser } from '../../lib/api'
import { parseApiDate } from '../../lib/format'
import type { AdminStats, AdminUser, Project } from '../../lib/types'

type Tab = 'overview' | 'users' | 'projects'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview')

  if (!getUser()?.is_admin) return <Navigate to="/" replace />

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'projects', label: 'Projects' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1 text-slate-900">Admin</h1>
        <p className="text-slate-500">Platform activity, users and projects.</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? <OverviewTab /> : tab === 'users' ? <UsersTab /> : <ProjectsTab />}
    </div>
  )
}

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

function formatDay(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function timeAgo(iso: string | null) {
  if (!iso) return 'Never'
  const date = parseApiDate(iso)
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString()
}

function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<AdminStats>('/api/admin/stats')
      .then(setStats)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load stats'))
  }, [])

  if (error) return <div className="p-8 text-center text-red-600">{error}</div>
  if (!stats) return <div className="p-8 text-center text-slate-500">Loading stats...</div>

  const maxSignups = Math.max(1, ...stats.signups_by_day.map((d) => d.count))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">People</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total users" value={stats.total_users} hint={`${stats.total_admins} admin(s)`} />
          <StatCard label="Active (24h)" value={stats.active_users_24h} hint="Signed in in the last day" />
          <StatCard label="Active (7d)" value={stats.active_users_7d} hint="Signed in in the last week" />
          <StatCard label="New signups (7d)" value={stats.new_users_7d} hint={`${stats.new_users_30d} in last 30d`} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Engagement</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Test attempts" value={stats.total_test_attempts} hint={`${stats.completed_test_attempts} completed`} />
          <StatCard label="Domain projects" value={stats.total_projects} />
          <StatCard label="Connections made" value={stats.total_connections} />
          <StatCard label="Resumes uploaded" value={stats.total_resumes} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Content</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Companies" value={stats.total_companies} />
          <StatCard label="Job descriptions" value={stats.total_job_descriptions} />
          <StatCard label="Interview questions" value={stats.total_interview_questions} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Signups, last 14 days</h2>
        <div className="flex items-end gap-2 h-32">
          {stats.signups_by_day.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 group">
              <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition">{d.count}</span>
              <div
                className="w-full rounded-t bg-indigo-500/80 hover:bg-indigo-600 transition-colors"
                style={{ height: `${Math.max(4, (d.count / maxSignups) * 100)}%` }}
              />
              <span className="text-[10px] text-slate-400 whitespace-nowrap">{formatDay(d.date)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide px-5 pt-5 pb-3">Recent signups</h2>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-5 py-2.5 font-medium">Name</th>
              <th className="px-5 py-2.5 font-medium">Email</th>
              <th className="px-5 py-2.5 font-medium">Joined</th>
              <th className="px-5 py-2.5 font-medium">Last active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stats.recent_users.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-2.5 font-medium text-slate-900">
                  <Link to={`/users/${u.id}`} className="hover:text-indigo-600 hover:underline">{u.full_name}</Link>
                </td>
                <td className="px-5 py-2.5 text-slate-600">{u.email}</td>
                <td className="px-5 py-2.5 text-slate-600">{parseApiDate(u.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-2.5 text-slate-600">{timeAgo(u.last_login_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  function load() {
    setLoading(true)
    setError('')
    api<AdminUser[]>('/api/admin/users')
      .then(setUsers)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load users'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function toggleAdmin(user: AdminUser) {
    setBusyId(user.id)
    try {
      const updated = await api<AdminUser>(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_admin: !user.is_admin }),
      })
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to update user')
    } finally {
      setBusyId(null)
    }
  }

  async function removeUser(user: AdminUser) {
    if (!confirm(`Delete ${user.full_name}? This also deletes any projects they created.`)) return
    setBusyId(user.id)
    try {
      await api(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to delete user')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Loading users...</div>
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Domain</th>
            <th className="px-4 py-3 font-medium">Joined</th>
            <th className="px-4 py-3 font-medium">Last active</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3 font-medium text-slate-900">
                <Link to={`/users/${u.id}`} className="hover:text-indigo-600 hover:underline">{u.full_name}</Link>
              </td>
              <td className="px-4 py-3 text-slate-600">{u.email}</td>
              <td className="px-4 py-3 text-slate-600">{u.domain || '—'}</td>
              <td className="px-4 py-3 text-slate-600">{parseApiDate(u.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-slate-600">{timeAgo(u.last_login_at)}</td>
              <td className="px-4 py-3">
                {u.is_admin ? (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">Admin</span>
                ) : (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">User</span>
                )}
              </td>
              <td className="px-4 py-3 text-right space-x-3">
                <button
                  onClick={() => toggleAdmin(u)}
                  disabled={busyId === u.id}
                  className="text-indigo-600 hover:underline disabled:opacity-50"
                >
                  {u.is_admin ? 'Demote' : 'Promote'}
                </button>
                <button
                  onClick={() => removeUser(u)}
                  disabled={busyId === u.id}
                  className="text-red-600 hover:underline disabled:opacity-50"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No users found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  function load() {
    setLoading(true)
    setError('')
    api<Project[]>('/api/admin/projects')
      .then(setProjects)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load projects'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function removeProject(project: Project) {
    if (!confirm(`Delete project "${project.title}"?`)) return
    setBusyId(project.id)
    try {
      await api(`/api/admin/projects/${project.id}`, { method: 'DELETE' })
      setProjects((prev) => prev.filter((p) => p.id !== project.id))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to delete project')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Loading projects...</div>
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Domain</th>
            <th className="px-4 py-3 font-medium">Creator</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {projects.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 font-medium text-slate-900">{p.title}</td>
              <td className="px-4 py-3 text-slate-600">{p.domain}</td>
              <td className="px-4 py-3 text-slate-600">
                <Link to={`/users/${p.created_by_id}`} className="hover:text-indigo-600 hover:underline">
                  {p.creator.full_name}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600">{new Date(p.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => removeProject(p)}
                  disabled={busyId === p.id}
                  className="text-red-600 hover:underline disabled:opacity-50"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {projects.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No projects found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
