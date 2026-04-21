import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../api/http'
import { cn } from '../ui/cn'

type Cmd = { label: string; to: string }

export default function Topbar({ onOpenMobileNav }: { onOpenMobileNav?: () => void }) {
  const { user, clearAuth, darkMode, setDarkMode } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [q, setQ] = useState('')

  const { data: unreadData } = useQuery({
    queryKey: ['notif-unread'],
    queryFn: async () => {
      const res = await http.get('/notifications/unread-count')
      return res.data as { count: number }
    },
    refetchInterval: 30000, // poll every 30s
  })
  const unreadCount = unreadData?.count ?? 0

  const commands: Cmd[] = useMemo(() => {
    if (!user) return []
    const profileLabel = user.role === 'student' ? 'Student Hub' : 'Profile'
    const contactLabel = user.role === 'student' ? 'Support Center' : user.role === 'teacher' ? 'Teacher Support' : 'Contact'
    const base: Cmd[] = [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Subjects', to: '/courses' },
      { label: 'Assignments', to: '/assignments' },
      { label: 'Attendance', to: '/attendance' },
      { label: 'Results', to: '/results' },
      { label: 'Fees', to: '/fees' },
      { label: 'Events', to: '/events' },
      { label: profileLabel, to: '/profile' },
      { label: 'Notifications', to: '/notifications' },
      { label: contactLabel, to: '/contact' },
      { label: 'Student Achievements', to: '/achievements' },
    ]
    if (user.role === 'teacher') return base.filter((x) => x.to !== '/fees' && x.to !== '/notifications')
    if (user.role === 'admin') return base.filter((x) => x.to === '/dashboard' || x.to === '/notifications')
    return base
  }, [user])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return []
    return commands.filter((c) => c.label.toLowerCase().includes(query)).slice(0, 6)
  }, [commands, q])

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/60 backdrop-blur dark:border-slate-800 dark:bg-slate-950/30">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 lg:hidden dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
        >
          <span className="text-xl">☰</span>
        </button>

        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
            {location.pathname === '/dashboard' ? 'Dashboard' : location.pathname.replace('/', '').replace('-', ' ') || 'Home'}
          </div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
            {user ? `${user.name} • ${user.role}` : 'Welcome'}
          </div>
        </div>

        <div className="relative ml-auto hidden w-[420px] max-w-full md:block">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages…"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-50"
          />
          {filtered.length ? (
            <div className="absolute left-0 right-0 top-12 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-950">
              {filtered.map((c) => (
                <button
                  key={c.to}
                  type="button"
                  onClick={() => {
                    setQ('')
                    navigate(c.to)
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900/60"
                >
                  <span>{c.label}</span>
                  <span className="text-xs text-slate-400">{c.to}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
            aria-label="Notifications"
            title="Notifications"
          >
            <span className="text-lg">🔔</span>
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => {
              if (user?.role === 'parent') {
                window.location.href = 'mailto:admin@studentflow.com?subject=Parent%20Support%20Request&body=Hello%20Admin%2C%0A%0A'
              } else {
                navigate('/contact')
              }
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
            aria-label="Email"
            title={user?.role === 'parent' ? 'Contact Admin' : 'Contact'}
          >
            <span className="text-lg">✉️</span>
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
            aria-label="Toggle dark mode"
            title="Dark mode"
          >
            <span className="text-lg">{darkMode ? '🌙' : '☀️'}</span>
          </button>

          {user ? (
            <button
              onClick={() => {
                clearAuth()
                navigate('/login')
              }}
              className={cn(
                'hidden h-10 items-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 md:inline-flex',
              )}
            >
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              className="hidden h-10 items-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 md:inline-flex"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

