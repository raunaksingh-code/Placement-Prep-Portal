import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api, apiUpload, ApiError, getUser } from '../../lib/api'
import { parseApiDate } from '../../lib/format'
import type { AdminStats, AdminUser, Project, AdminTestAttempt } from '../../lib/types'

type Tab = 'overview' | 'users' | 'tests' | 'publish'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview')

  if (!getUser()?.is_admin) return <Navigate to="/" replace />

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'tests', label: 'Test Attempts' },
    { id: 'publish', label: 'Publish Test' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1 text-slate-900">Admin</h1>
        <p className="text-slate-500">Platform activity, users and tests.</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${
              tab === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'tests' && <TestsTab />}
      {tab === 'publish' && <PublishTestTab />}
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

function TestsTab() {
  const [attempts, setAttempts] = useState<AdminTestAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    setError('')
    api<AdminTestAttempt[]>('/api/admin/tests')
      .then(setAttempts)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load test attempts'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  if (loading) return <div className="p-8 text-center text-slate-500">Loading test attempts...</div>
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">User</th>
            <th className="px-4 py-3 font-medium">Test Title</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Score</th>
            <th className="px-4 py-3 font-medium">Accuracy</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Started At</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {attempts.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3">
                <Link to={`/users/${a.user_id}`} className="font-medium text-slate-900 hover:text-indigo-600 hover:underline">
                  {a.user_name}
                </Link>
                <div className="text-xs text-slate-500">{a.user_email}</div>
              </td>
              <td className="px-4 py-3 text-slate-600">{a.test_title}</td>
              <td className="px-4 py-3 text-slate-600 capitalize">{a.test_type}</td>
              <td className="px-4 py-3 text-slate-900 font-medium">
                {a.is_completed ? `${a.score} / ${a.total}` : '—'}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {a.is_completed ? `${a.accuracy}%` : '—'}
              </td>
              <td className="px-4 py-3">
                {a.is_completed ? (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Completed</span>
                ) : (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">In Progress</span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {new Date(a.started_at).toLocaleDateString()} {new Date(a.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </td>
              <td className="px-4 py-3 text-right">
                {a.is_completed && (
                  <Link
                    to={`/attempts/${a.id}`}
                    className="text-indigo-600 hover:underline"
                  >
                    View Report
                  </Link>
                )}
              </td>
            </tr>
          ))}
          {attempts.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-slate-500">No test attempts found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function PublishTestTab() {
  const [title, setTitle] = useState('')
  const [testType, setTestType] = useState('mock')
  const [track, setTrack] = useState('aptitude')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [negativeMark, setNegativeMark] = useState(0.25)
  
  const [questions, setQuestions] = useState([{
    text: '',
    explanation: '',
    options: [
      { text: '', is_correct: true },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false }
    ]
  }])
  
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function addQuestion() {
    setQuestions([...questions, {
      text: '',
      explanation: '',
      options: [
        { text: '', is_correct: true },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false }
      ]
    }])
  }

  function updateQuestion(qIndex: number, field: string, value: string) {
    const newQs = [...questions]
    newQs[qIndex] = { ...newQs[qIndex], [field]: value }
    setQuestions(newQs)
  }

  function updateOption(qIndex: number, optIndex: number, text: string) {
    const newQs = [...questions]
    newQs[qIndex].options[optIndex].text = text
    setQuestions(newQs)
  }

  function setCorrectOption(qIndex: number, optIndex: number) {
    const newQs = [...questions]
    newQs[qIndex].options.forEach((opt, idx) => {
      opt.is_correct = (idx === optIndex)
    })
    setQuestions(newQs)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (questions.length === 0) return setError('Please add at least one question.')
    
    // basic validation
    for (const q of questions) {
      if (!q.text.trim()) return setError('All questions must have text.')
      for (const opt of q.options) {
        if (!opt.text.trim()) return setError('All options must have text.')
      }
    }

    setError('')
    setSuccess('')
    setSubmitting(true)
    
    const payload = {
      title,
      test_type: testType,
      track,
      duration_minutes: durationMinutes,
      negative_mark: negativeMark,
      questions
    }

    try {
      await api('/api/admin/tests/publish', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      setSuccess('Interactive test published successfully!')
      setTitle('')
      setQuestions([{
        text: '',
        explanation: '',
        options: [
          { text: '', is_correct: true },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
          { text: '', is_correct: false }
        ]
      }])
    } catch(err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-4xl">
      <h2 className="text-lg font-semibold mb-4">Publish Interactive Test</h2>
      <p className="text-sm text-slate-500 mb-6">
        Create a live test with questions and options. Students will take this test interactively.
      </p>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. TCS Ninja Mock Test 1" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Duration (Minutes)</label>
            <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(parseInt(e.target.value))} required min="1" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Test Type</label>
            <select value={testType} onChange={(e) => setTestType(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="mock">Full Mock Test</option>
              <option value="sectional">Sectional Test</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Track</label>
            <select value={track} onChange={(e) => setTrack(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="aptitude">Aptitude (Default)</option>
              <option value="domain">Domain</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Negative Marking (e.g. 0.25)</label>
            <input type="number" step="0.01" value={negativeMark} onChange={(e) => setNegativeMark(parseFloat(e.target.value))} required min="0" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <hr className="my-6" />

        <div className="space-y-6">
          <h3 className="font-semibold text-lg">Questions</h3>
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="p-4 border rounded-xl bg-slate-50 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Question {qIndex + 1}</span>
                {questions.length > 1 && (
                  <button type="button" onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))} className="text-red-600 text-sm hover:underline">Remove</button>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-slate-500">Question Text</label>
                <textarea value={q.text} onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)} required rows={2} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {q.options.map((opt, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${qIndex}`} checked={opt.is_correct} onChange={() => setCorrectOption(qIndex, optIndex)} className="w-4 h-4 text-indigo-600" />
                    <input type="text" value={opt.text} onChange={(e) => updateOption(qIndex, optIndex, e.target.value)} required placeholder={`Option ${String.fromCharCode(65 + optIndex)}`} className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-slate-500">Explanation (Optional)</label>
                <textarea value={q.explanation} onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)} rows={1} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"></textarea>
              </div>
            </div>
          ))}
          
          <button type="button" onClick={addQuestion} className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-600 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-400 transition">
            + Add Another Question
          </button>
        </div>

        <div className="pt-4 border-t">
          <button type="submit" disabled={submitting} className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 w-full sm:w-auto">
            {submitting ? 'Publishing...' : 'Publish Test'}
          </button>
        </div>
      </form>
    </div>
  )
}
