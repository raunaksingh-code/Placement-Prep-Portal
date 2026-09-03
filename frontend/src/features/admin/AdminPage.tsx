import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api, ApiError, getUser } from '../../lib/api'
import type { Project, User } from '../../lib/types'

type Tab = 'users' | 'projects'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')

  if (!getUser()?.is_admin) return <Navigate to="/" replace />

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1 text-slate-900">Admin</h1>
        <p className="text-slate-500">Manage users and projects.</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {(['users', 'projects'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t === 'users' ? 'Users' : 'Projects'}
          </button>
        ))}
      </div>

      {tab === 'users' ? <UsersTab /> : <ProjectsTab />}
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  function load() {
    setLoading(true)
    setError('')
    api<User[]>('/api/admin/users')
      .then(setUsers)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load users'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function toggleAdmin(user: User) {
    setBusyId(user.id)
    try {
      const updated = await api<User>(`/api/admin/users/${user.id}`, {
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

  async function removeUser(user: User) {
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
              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No users found.</td>
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
