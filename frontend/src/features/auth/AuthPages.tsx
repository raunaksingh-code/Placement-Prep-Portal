import { useEffect, useRef, useState, type FormEvent } from 'react'
import { GraduationCap } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api, setAuth, type User } from '../../lib/api'

interface TokenResponse {
  access_token: string
  user: User
}

// Populated by the Google Identity Services script once it loads.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

const GOOGLE_CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID

let googleScriptPromise: Promise<void> | null = null
function loadGoogleScript(): Promise<void> {
  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Sign-In'))
      document.head.appendChild(script)
    })
  }
  return googleScriptPromise
}

function GoogleSignInButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const buttonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    let cancelled = false
    loadGoogleScript().then(() => {
      if (cancelled || !buttonRef.current || !window.google) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => onCredential(response.credential),
      })
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 336,
      })
    })
    return () => {
      cancelled = true
    }
  }, [onCredential])

  if (!GOOGLE_CLIENT_ID) return null

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
        <div className="h-px flex-1 bg-slate-200" />
        <span>OR</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      <div ref={buttonRef} className="flex justify-center" />
    </div>
  )
}

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <GraduationCap size={24} strokeWidth={2.25} />
          </span>
        </div>
        <h1 className="text-2xl font-bold text-center text-indigo-700 mb-1">Placement Mantra</h1>
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

  async function submitGoogleCredential(credential: string) {
    setBusy(true)
    setError('')
    try {
      const res = await api<TokenResponse>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      })
      setAuth(res.access_token, res.user)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
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
      <GoogleSignInButton onCredential={submitGoogleCredential} />
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
