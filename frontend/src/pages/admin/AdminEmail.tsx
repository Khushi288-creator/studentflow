import React, { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Page } from '../../components/ui/Page'

type RecipientsData = {
  totalUsers: number
  students: number
  teachers: number
  parents: number
  classes: string[]
  users: { id: string; name: string; email: string; role: string }[]
}

const TARGET_LABELS: Record<string, string> = {
  all: '🌐 All Users',
  students: '🎓 All Students',
  teachers: '👨‍🏫 All Teachers',
  parents: '👨‍👩‍👧 All Parents',
}

export default function AdminEmail() {
  const [target, setTarget] = useState('all')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warn'; msg: string } | null>(null)
  const [userSearch, setUserSearch] = useState('')

  const { data } = useQuery({
    queryKey: ['emailRecipients'],
    queryFn: async () => (await http.get('/admin/email/recipients')).data as RecipientsData,
  })

  const sendMut = useMutation({
    mutationFn: async () => (await http.post('/admin/email/send', { subject, body, target })).data,
    onSuccess: (d) => {
      const type = d.skipped ? 'warn' : 'success'
      setToast({ type, msg: d.message })
      setTimeout(() => setToast(null), 6000)
      if (!d.skipped) { setSubject(''); setBody('') }
    },
    onError: (e: any) => {
      setToast({ type: 'error', msg: e?.response?.data?.message ?? 'Failed to send email' })
      setTimeout(() => setToast(null), 5000)
    },
  })

  const classes = data?.classes ?? []
  const users = (data?.users ?? []).filter(u =>
    !userSearch.trim() ||
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  const getTargetLabel = () => {
    if (TARGET_LABELS[target]) return TARGET_LABELS[target]
    if (target.startsWith('class:')) return `📚 Class ${target.replace('class:', '')}`
    if (target.startsWith('user:')) {
      const u = data?.users.find(u => u.id === target.replace('user:', ''))
      return u ? `👤 ${u.name}` : '👤 Individual User'
    }
    return target
  }

  return (
    <Page title="📧 Email Center" subtitle="Send real emails to users via Gmail SMTP">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 rounded-2xl border px-5 py-3 shadow-2xl max-w-sm ${
          toast.type === 'success' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' :
          toast.type === 'warn'    ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' :
                                     'border-rose-500/40 bg-rose-500/10 text-rose-300'
        }`}>
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0">{toast.type === 'success' ? '✓' : toast.type === 'warn' ? '⚠' : '✕'}</span>
            <span className="text-sm font-medium">{toast.msg}</span>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-12">

        {/* ── Left: Compose ── */}
        <div className="lg:col-span-8 space-y-4">

          {/* Config notice */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <div className="text-sm font-semibold text-amber-300 mb-1">⚙️ Setup Required</div>
            <div className="text-xs text-amber-200/80 space-y-1">
              <div>Add these to <code className="bg-black/20 px-1 rounded">backend/.env</code>:</div>
              <div className="font-mono bg-black/20 rounded-xl px-3 py-2 text-xs mt-2 space-y-0.5">
                <div>EMAIL_USER=your_gmail@gmail.com</div>
                <div>EMAIL_PASS=your_16_char_app_password</div>
              </div>
              <div className="mt-1">Generate App Password at <span className="text-amber-300">myaccount.google.com/apppasswords</span> (requires 2FA)</div>
            </div>
          </div>

          {/* Compose form */}
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600/20 text-xl">📧</div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Compose Email</div>
                <div className="text-xs text-slate-500">To: <span className="text-indigo-400 font-medium">{getTargetLabel()}</span></div>
              </div>
            </div>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Subject *</span>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Annual Sports Day Announcement"
                className="h-11 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-4 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 placeholder:text-slate-400"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Message *</span>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={8}
                placeholder="Write your message here..."
                className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 placeholder:text-slate-400 resize-none"
              />
              <div className="text-right text-xs text-slate-400">{body.length} chars</div>
            </label>

            <button
              type="button"
              disabled={sendMut.isPending || !subject.trim() || !body.trim()}
              onClick={() => sendMut.mutate()}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-semibold text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
            >
              {sendMut.isPending ? '⏳ Sending...' : `📤 Send Email to ${getTargetLabel()}`}
            </button>
          </div>
        </div>

        {/* ── Right: Target Selector ── */}
        <div className="lg:col-span-4 space-y-4">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Students', value: data?.students ?? 0, color: 'text-amber-400', key: 'students' },
              { label: 'Teachers', value: data?.teachers ?? 0, color: 'text-violet-400', key: 'teachers' },
              { label: 'Parents',  value: data?.parents  ?? 0, color: 'text-pink-400',   key: 'parents'  },
              { label: 'Total',    value: data?.totalUsers ?? 0, color: 'text-indigo-400', key: 'all'    },
            ].map(s => (
              <button key={s.key} type="button" onClick={() => setTarget(s.key)}
                className={`rounded-2xl border p-3 text-left transition-all ${
                  target === s.key
                    ? 'border-indigo-500/50 bg-indigo-500/10'
                    : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 hover:border-indigo-500/30'
                }`}>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </button>
            ))}
          </div>

          {/* Target selector */}
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-4 space-y-2">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Send To</div>

            {/* Bulk targets */}
            {Object.entries(TARGET_LABELS).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setTarget(key)}
                className={`w-full text-left rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  target === key
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}>
                {label}
              </button>
            ))}

            {/* By class */}
            {classes.length > 0 && (
              <>
                <div className="text-xs text-slate-400 pt-2 pb-1">By Class</div>
                {classes.map(cls => (
                  <button key={cls} type="button" onClick={() => setTarget(`class:${cls}`)}
                    className={`w-full text-left rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      target === `class:${cls}`
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}>
                    📚 Class {cls}
                  </button>
                ))}
              </>
            )}

            {/* Individual user */}
            <div className="text-xs text-slate-400 pt-2 pb-1">Individual User</div>
            <input
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="h-9 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 placeholder:text-slate-400"
            />
            <div className="max-h-40 overflow-y-auto space-y-1">
              {users.slice(0, 20).map(u => (
                <button key={u.id} type="button" onClick={() => setTarget(`user:${u.id}`)}
                  className={`w-full text-left rounded-xl px-3 py-2 transition-all ${
                    target === `user:${u.id}`
                      ? 'bg-indigo-600 text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}>
                  <div className="text-xs font-medium text-slate-900 dark:text-white truncate">{u.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{u.email}</div>
                </button>
              ))}
              {users.length === 0 && userSearch && (
                <div className="text-xs text-slate-500 px-3 py-2">No users found</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Page>
  )
}
