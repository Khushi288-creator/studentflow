import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore, type UserRole } from '../../store/authStore'

type NavItem = { label: string; to: string; roles?: UserRole[] }

const baseItems: NavItem[] = [
]

export default function Navbar() {
  const { user, clearAuth, darkMode, setDarkMode } = useAuthStore()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const items = useMemo(() => {
    if (!user) return baseItems
    if (user.role === 'student')
      return [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Subjects', to: '/courses' },
        { label: 'Assignments', to: '/assignments' },
        { label: 'Attendance', to: '/attendance' },
        { label: 'Results', to: '/results' },
        { label: 'Fees', to: '/fees' },
        { label: 'Events', to: '/events' },
        { label: 'Profile', to: '/profile' },
        { label: 'Notifications', to: '/notifications' },
      ] satisfies NavItem[]
    if (user.role === 'teacher')
      return [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Subjects', to: '/courses' },
        { label: 'Assignments', to: '/assignments' },
        { label: 'Attendance', to: '/attendance' },
        { label: 'Results', to: '/results' },
        { label: 'Profile', to: '/profile' },
      ] satisfies NavItem[]
    return [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Profile', to: '/profile' },
      { label: 'Notifications', to: '/notifications' },
    ] satisfies NavItem[]
  }, [user])

  const activeTo = location.pathname

  return (
    <header className="sticky top-0 z-40 bg-white/70 backdrop-blur dark:bg-slate-950/70">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/') }
              className="rounded-xl px-2 py-1 text-left hover:bg-slate-100 dark:hover:bg-slate-900"
              aria-label="Go to Home"
            >
              <div className="font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Edu<span className="text-indigo-600">Flow</span>
              </div>
              <div className="text-xs text-slate-500">Smart Student Management</div>
            </button>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            {items.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                className={[
                  'rounded-xl px-3 py-2 text-sm font-medium transition',
                  activeTo === it.to ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900',
                ].join(' ')}
              >
                {it.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
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
                className="hidden rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 md:inline-flex"
              >
                Logout
              </button>
            ) : (
              null
            )}

            {/* Mobile menu */}
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white md:hidden dark:border-slate-800 dark:bg-slate-950"
              onClick={() => setOpen(!open)}
              aria-label="Open menu"
            >
              <span className="text-xl">{open ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>

        {open ? (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="grid grid-cols-1 gap-1">
              {items.map((it) => (
                <Link
                  key={it.to}
                  to={it.to}
                  onClick={() => setOpen(false)}
                  className={[
                    'rounded-xl px-3 py-2 text-sm font-medium transition',
                    activeTo === it.to ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900',
                  ].join(' ')}
                >
                  {it.label}
                </Link>
              ))}
              {user ? (
                <button
                  onClick={() => {
                    clearAuth()
                    setOpen(false)
                    navigate('/login')
                  }}
                  className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  Logout
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  )
}

