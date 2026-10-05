import { GraduationCap, LogOut, Search, Bell, X, MessageSquare, UserPlus } from 'lucide-react'
import { Link, Navigate, NavLink, Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { api, clearAuth, getToken, getUser } from '../lib/api'
import { LoginPage } from '../features/auth/AuthPages'
import HomePage from '../features/home/HomePage'
import { useState, useEffect, useRef } from 'react'

const NAV = [
  { to: '/aptitude', label: 'Aptitude' },
  { to: '/domain-prep', label: 'Domains' },
  { to: '/business-news', label: 'Business News' },
  { to: '/companies', label: 'Companies' },
  { to: '/mock-tests', label: 'Tests' },
  { to: '/interview-prep', label: 'Interviews' },
  { to: '/ai-coach', label: 'AI Coach' },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = getUser()
  const isAuth = !!getToken()

  const [notifications, setNotifications] = useState({ connection_requests: 0, unread_messages: 0, total: 0 })
  const [showNotifications, setShowNotifications] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAuth) return
    const fetchNotifs = () => {
      api<any>('/api/notifications/unread').then(setNotifications).catch(() => {})
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 15000)
    return () => clearInterval(interval)
  }, [isAuth, location.pathname]) // re-fetch on navigation too

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    if (showNotifications) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNotifications])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newParams = new URLSearchParams(searchParams)
    if (e.target.value) {
      newParams.set('q', e.target.value)
    } else {
      newParams.delete('q')
    }
    setSearchParams(newParams)
  }

  // If they aren't authenticated and are trying to access a page other than root,
  // we show the login modal over the homepage.
  const showLoginModal = !isAuth && location.pathname !== '/'

  const nav = user?.is_admin ? [...NAV, { to: '/admin', label: 'Admin' }] : NAV
  const initials = (user?.full_name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[95rem] mx-auto px-4 h-[72px] flex items-center justify-between gap-6">
          <div className="flex items-center gap-6 xl:gap-10 shrink-0">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white">
                <GraduationCap size={20} strokeWidth={2.5} />
              </span>
              <span className="font-extrabold text-xl text-slate-900 tracking-tight">Placement<span className="text-emerald-500">Mantra</span></span>
            </Link>
            
            <nav className="hidden lg:flex items-center gap-1.5 text-[15px] font-medium">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-md whitespace-nowrap transition-colors ${
                      isActive
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-50'
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6 flex-1 justify-end">
            <div className="hidden md:flex relative max-w-md w-full mr-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={searchParams.get('q') || ''}
                onChange={handleSearch}
                placeholder="Search for modules..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {isAuth && (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors relative"
                >
                  <Bell size={18} />
                  {notifications.total > 0 && (
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-72 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-800 bg-slate-50/50">
                      Notifications
                    </div>
                    {notifications.total === 0 ? (
                      <div className="px-4 py-6 text-sm text-center text-slate-500">
                        You're all caught up!
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {notifications.connection_requests > 0 && (
                          <Link 
                            to="/network" 
                            state={{ tab: 'requests' }} 
                            onClick={() => setShowNotifications(false)} 
                            className="px-4 py-4 text-sm hover:bg-slate-50 border-b border-slate-50 flex items-start gap-3 transition-colors"
                          >
                            <div className="mt-0.5 p-1.5 bg-blue-100 text-blue-600 rounded-full">
                              <UserPlus size={14} />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-slate-800">New Connection Request</div>
                              <div className="text-slate-500 mt-0.5">You have {notifications.connection_requests} pending request{notifications.connection_requests > 1 ? 's' : ''}.</div>
                            </div>
                          </Link>
                        )}
                        {notifications.unread_messages > 0 && (
                          <Link 
                            to="/network" 
                            state={{ tab: 'messages' }} 
                            onClick={() => setShowNotifications(false)} 
                            className="px-4 py-4 text-sm hover:bg-slate-50 flex items-start gap-3 transition-colors"
                          >
                            <div className="mt-0.5 p-1.5 bg-emerald-100 text-emerald-600 rounded-full">
                              <MessageSquare size={14} />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-slate-800">New Message</div>
                              <div className="text-slate-500 mt-0.5">You have {notifications.unread_messages} unread message{notifications.unread_messages > 1 ? 's' : ''}.</div>
                            </div>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isAuth ? (
              <button
                onClick={() => {
                  clearAuth()
                  navigate('/login')
                }}
                className="px-5 py-2 rounded-md border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2 rounded-md bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors shadow-sm"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-[85rem] mx-auto px-4 py-8 relative">
        {showLoginModal && (
           <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
             <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
                <button onClick={() => navigate('/')} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1 transition-colors">
                  <X size={20} />
                </button>
                <LoginPage isModal={true} />
             </div>
           </div>
        )}
        {showLoginModal ? <HomePage /> : <Outlet />}
      </main>
    </div>
  )
}
