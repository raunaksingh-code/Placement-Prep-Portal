import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearAuth, getToken, getUser } from '../lib/api'

const NAV = [
  { to: '/aptitude', label: 'Aptitude' },
  { to: '/mock-tests', label: 'Mock Tests' },
  { to: '/interview-prep', label: 'Interview Prep' },
  { to: '/companies', label: 'Companies & JDs' },
  { to: '/question-bank', label: 'Question Bank' },
  { to: '/progress', label: 'Progress' },
]

export default function Layout() {
  const navigate = useNavigate()
  const user = getUser()

  if (!getToken()) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link to="/" className="font-bold text-lg text-indigo-700 whitespace-nowrap">
              Placement Prep Portal
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    isActive
                      ? 'text-indigo-700 font-medium'
                      : 'text-slate-600 hover:text-slate-900'
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500 hidden sm:inline">{user?.full_name}</span>
            <button
              onClick={() => {
                clearAuth()
                navigate('/login')
              }}
              className="text-slate-600 hover:text-slate-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
