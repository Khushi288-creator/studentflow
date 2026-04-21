import { Outlet, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ChatWidget from '../smart/ChatWidget'
import { useAuthStore } from '../../store/authStore'

function MobileNav({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const items = useMemo(() => {
    if (!user) return []
    if (user.role === 'teacher')
      return [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Subjects', to: '/courses' },
        { label: 'Assignments', to: '/assignments' },
        { label: 'Attendance', to: '/attendance' },
        { label: 'Results', to: '/results' },
        { label: 'Profile', to: '/profile' },
        { label: 'Contact', to: '/contact' },
      ]
    if (user.role === 'admin')
      return [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Profile', to: '/profile' },
        { label: 'Notifications', to: '/notifications' },
      ]
    if (user.role === 'parent')
      return [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Notifications', to: '/notifications' },
      ]
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
      { label: 'Contact', to: '/contact' },
      { label: 'Skill Hub', to: '/skill-hub' },
    ]
  }, [user])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        className="absolute inset-0 bg-slate-950/40"
        aria-label="Close navigation overlay"
        onClick={onClose}
      />
      <div className="absolute left-0 top-0 h-full w-[320px] bg-white p-4 shadow-xl dark:bg-slate-950">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-slate-900 dark:text-slate-50">Navigation</div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>
        <div className="mt-4 space-y-1">
          {items.map((it) => (
            <button
              key={it.to}
              type="button"
              onClick={() => {
                navigate(it.to)
                onClose()
              }}
              className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900/60"
            >
              <span>{it.label}</span>
              <span className="text-xs text-slate-400">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px]">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
          <main className="min-w-0 flex-1 px-4 py-6 lg:px-6">
            <Outlet />
          </main>
        </div>
      </div>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <ChatWidget />
    </div>
  )
}

