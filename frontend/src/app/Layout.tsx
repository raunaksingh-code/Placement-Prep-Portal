import { LogOut } from 'lucide-react'
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearAuth, getToken, getUser } from '../lib/api'

const NAV = [
  { to: '/aptitude', label: 'Aptitude' },
  { to: '/mock-tests', label: 'Mock Tests' },
  { to: '/interview-prep', label: 'Interview Prep' },
  { to: '/companies', label: 'Companies & JDs' },
  { to: '/question-bank', label: 'Question Bank' },
  { to: '/progress', label: 'Progress' },
  { to: '/network', label: 'Network' },
  { to: '/projects', label: 'Projects' },
  { to: '/ai-coach', label: 'AI Coach' },
]

export default function Layout() {
  const navigate = useNavigate()
  const user = getUser()

  if (!getToken()) return <Navigate to="/login" replace />

  const nav = user?.is_admin ? [...NAV, { to: '/admin', label: 'Admin' }] : NAV
  const initials = (user?.full_name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-10">
        <div className="max-w-[90rem] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-7 min-w-0 overflow-x-auto no-scrollbar">
            <Link to="/" className="flex items-center gap-2.5 whitespace-nowrap">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-bold text-sm shadow-md shadow-indigo-500/30">
                P
              </span>
              <span className="font-bold text-[15px] text-slate-900">Placement Prep Portal</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'text-indigo-700 bg-indigo-50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm shrink-0">
            <Link
              to="/profile"
              className="hidden sm:flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                {initials}
              </span>
              <span className="text-slate-700 font-medium whitespace-nowrap">{user?.full_name}</span>
            </Link>
            <button
              onClick={() => {
                clearAuth()
                navigate('/login')
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
