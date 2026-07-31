import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, setAuth, type User } from '../../lib/api'

interface TokenResponse {
  access_token: string
  user: User
}

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-indigo-700 mb-1">Placement Prep Portal</h1>
        <p className="text-center text-slate-500 mb-6">{title}</p>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">{children}</div>
      </div>
    </div>
  )
}

const inputCls =
  'w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500'
const btnCls =
  'w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg py-2 disabled:opacity-50'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await api<TokenResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setAuth(res.access_token, res.user)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Sign in to continue your preparation">
      <form onSubmit={submit} className="space-y-4">
        <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={inputCls} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className={btnCls} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="text-sm text-center text-slate-500 mt-4">
        New here?{' '}
        <Link to="/register" className="text-indigo-600 hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await api<TokenResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, full_name: fullName, password }),
      })
      setAuth(res.access_token, res.user)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Create your account">
      <form onSubmit={submit} className="space-y-4">
        <input className={inputCls} placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={inputCls} type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className={btnCls} disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="text-sm text-center text-slate-500 mt-4">
        Already registered?{' '}
        <Link to="/login" className="text-indigo-600 hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  )
}
