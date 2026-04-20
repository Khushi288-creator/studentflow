import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { useAuthStore } from '../../store/authStore'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import { useModalClose } from '../../hooks/useModalClose'

type Teacher = { id: string; name: string; subject: string }
type MyMessage = { id: string; teacherName: string; message: string; category: string; createdAt: string }
type AdminMessage = { id: string; studentName: string; teacherName: string; message: string; category: string; createdAt: string }

// ── Shared helpers ─────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { label: string; color: string }> = {
  complaint: { label: '🚨 Complaint',       color: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' },
  query:     { label: '❓ Query',            color: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30' },
  request:   { label: '📋 Request / Notice', color: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
}

function CatBadge({ cat }: { cat: string }) {
  const m = CATEGORY_META[cat] ?? { label: cat, color: 'bg-slate-500/15 text-slate-300 ring-slate-500/30' }
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${m.color}`}>{m.label}</span>
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 backdrop-blur-sm p-5 ${className}`}>
      {children}
    </div>
  )
}

function GlassInput({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-500 transition-colors ${className}`}
    />
  )
}

function GlassSelect({ children, className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-10 w-full rounded-xl border border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 transition-colors ${className}`}
    >
      {children}
    </select>
  )
}

function GlassTextarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-500 transition-colors resize-none ${className}`}
    />
  )
}

function GradientButton({ children, disabled, onClick, className = '' }: {
  children: React.ReactNode; disabled?: boolean; onClick?: () => void; className?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white
        hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 transition-all
        shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 ${className}`}
    >
      {children}
    </button>
  )
}

// ── Teacher dropdown shared ────────────────────────────────────────────────
function TeacherSelect({ value, onChange, teachers, loading }: {
  value: string; onChange: (v: string) => void
  teachers: Teacher[]; loading: boolean
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
        Select Teacher * {loading && <span className="text-slate-500 dark:text-slate-500">(loading...)</span>}
      </span>
      <GlassSelect value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select teacher...</option>
        {teachers.map(t => (
          <option key={t.id} value={t.id}>{t.name}{t.subject ? ` — ${t.subject}` : ''}</option>
        ))}
      </GlassSelect>
      {!loading && teachers.length === 0 && (
        <span className="text-xs text-rose-400">No teachers found.</span>
      )}
    </label>
  )
}

// ── Student View ───────────────────────────────────────────────────────────
function StudentContact() {
  const [tab, setTab] = useState<'admin' | 'teacher'>('admin')

  // Shared teacher list
  const teachersQuery = useQuery({
    queryKey: ['teachersList'],
    queryFn: async () => (await http.get('/teachers')).data as { teachers: Teacher[] },
  })
  const teachers = teachersQuery.data?.teachers ?? []

  // My messages
  const myMsgQuery = useQuery({
    queryKey: ['myMessages'],
    queryFn: async () => (await http.get('/contact/my-messages')).data as { messages: MyMessage[] },
  })
  const myMessages = myMsgQuery.data?.messages ?? []

  // Form state — complaint tab
  const [cTeacherId, setCTeacherId] = useState('')
  const [cMessage, setCMessage] = useState('')
  const [cSuccess, setCSuccess] = useState(false)

  // Form state — message tab
  const [mTeacherId, setMTeacherId] = useState('')
  const [mCategory, setMCategory] = useState<'query' | 'request'>('query')
  const [mMessage, setMMessage] = useState('')
  const [mSuccess, setMSuccess] = useState(false)

  const sendMutation = useMutation({
    mutationFn: async (body: { teacherId: string; message: string; category: string }) => {
      console.log('[Support Center] sending:', body)
      return (await http.post('/contact', body)).data
    },
    onSuccess: (_, vars) => {
      myMsgQuery.refetch()
      if (vars.category === 'complaint') {
        setCMessage(''); setCTeacherId(''); setCSuccess(true)
        setTimeout(() => setCSuccess(false), 4000)
      } else {
        setMMessage(''); setMTeacherId(''); setMSuccess(true)
        setTimeout(() => setMSuccess(false), 4000)
      }
    },
  })

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-white">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-200 dark:border-white/8 bg-white/3 backdrop-blur-sm px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg shadow-lg shadow-indigo-500/25">
            💬
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Support Center</h1>
            <p className="text-xs text-slate-400 mt-0.5">Need help? Reach out to teachers or admin anytime 💬</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

        {/* Tab switcher */}
        <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-1 w-fit">
          {([
            { key: 'admin', label: '🚨 Contact Admin' },
            { key: 'teacher', label: '💬 Message Teacher' },
          ] as const).map(t => (
            <button key={t.key} type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                tab === t.key
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Contact Admin tab ── */}
        {tab === 'admin' && (
          <GlassCard>
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">File a Complaint</div>
              <div className="text-xs text-slate-500 mt-0.5">Complaint will be sent to the selected teacher and all admins.</div>
            </div>

            {cSuccess && (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                ✓ Complaint sent. Admin and teacher have been notified.
              </div>
            )}

            <div className="space-y-3">
              <TeacherSelect value={cTeacherId} onChange={setCTeacherId} teachers={teachers} loading={teachersQuery.isLoading} />

              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Describe your complaint *</span>
                <GlassTextarea rows={4} value={cMessage} onChange={e => setCMessage(e.target.value)}
                  placeholder="Describe the issue in detail..." />
              </label>

              <div className="flex items-center gap-3 pt-1">
                <GradientButton
                  disabled={!cTeacherId || !cMessage.trim() || sendMutation.isPending}
                  onClick={() => sendMutation.mutate({ teacherId: cTeacherId, message: cMessage.trim(), category: 'complaint' })}>
                  {sendMutation.isPending ? 'Sending...' : '🚨 Send Complaint'}
                </GradientButton>
                {sendMutation.isError && (
                  <span className="text-xs text-rose-400">
                    {(sendMutation.error as any)?.response?.data?.message ?? 'Failed. Try again.'}
                  </span>
                )}
              </div>
            </div>
          </GlassCard>
        )}

        {/* ── Message Teacher tab ── */}
        {tab === 'teacher' && (
          <GlassCard>
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Send a Message</div>
              <div className="text-xs text-slate-500 mt-0.5">Send a query or request directly to your teacher.</div>
            </div>

            {mSuccess && (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                ✓ Message sent. Teacher has been notified.
              </div>
            )}

            <div className="space-y-3">
              <TeacherSelect value={mTeacherId} onChange={setMTeacherId} teachers={teachers} loading={teachersQuery.isLoading} />

              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Category *</span>
                <GlassSelect value={mCategory} onChange={e => setMCategory(e.target.value as any)}>
                  <option value="query">❓ Query</option>
                  <option value="request">📋 Request / Notice</option>
                </GlassSelect>
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Your message *</span>
                <GlassTextarea rows={4} value={mMessage} onChange={e => setMMessage(e.target.value)}
                  placeholder="Write your message..." />
              </label>

              <div className="flex items-center gap-3 pt-1">
                <GradientButton
                  disabled={!mTeacherId || !mMessage.trim() || sendMutation.isPending}
                  onClick={() => sendMutation.mutate({ teacherId: mTeacherId, message: mMessage.trim(), category: mCategory })}>
                  {sendMutation.isPending ? 'Sending...' : '💬 Send Message'}
                </GradientButton>
                {sendMutation.isError && (
                  <span className="text-xs text-rose-400">
                    {(sendMutation.error as any)?.response?.data?.message ?? 'Failed. Try again.'}
                  </span>
                )}
              </div>
            </div>
          </GlassCard>
        )}

        {/* ── My Messages ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">📨 My Messages</span>
            <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300">
              {myMessages.length}
            </span>
          </div>

          {myMsgQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : myMessages.length === 0 ? (
            <GlassCard className="text-center py-8">
              <p className="text-sm text-slate-500">No messages sent yet.</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {myMessages.map(m => (
                <div key={m.id}
                  className="rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/5 p-4 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-white/8 hover:scale-[1.005] hover:shadow-md hover:shadow-indigo-500/5">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <CatBadge cat={m.category} />
                    <span className="text-xs text-slate-500 dark:text-slate-400">→ {m.teacherName}</span>
                    <span className="ml-auto text-xs text-slate-500">{m.createdAt}</span>
                  </div>
                  <p className="text-sm text-slate-200 line-clamp-2">{m.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Admin View ─────────────────────────────────────────────────────────────
type InboxMessage = {
  id: string
  senderName: string
  senderRole: string
  teacherName: string
  message: string
  category: string
  status: string
  adminReply: string | null
  createdAt: string
}

const CAT_META: Record<string, { label: string; color: string }> = {
  complaint:                { label: '🚨 Complaint',        color: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' },
  query:                    { label: '❓ Query',            color: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30' },
  request:                  { label: '📋 Request',          color: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
  technical:                { label: '🔧 Technical',        color: 'bg-blue-500/15 text-blue-300 ring-blue-500/30' },
  student_issue:            { label: '👤 Student Issue',    color: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' },
  other:                    { label: '💬 Other',            color: 'bg-slate-500/15 text-slate-300 ring-slate-500/30' },
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${color}`}>{label}</span>
}

function ReplyModal({ msg, onClose, onSent }: { msg: InboxMessage; onClose: () => void; onSent: () => void }) {
  const [reply, setReply] = useState(msg.adminReply ?? '')
  const [error, setError] = useState('')

  useModalClose(true, onClose)

  const mutation = useMutation({
    mutationFn: async () => (await http.post(`/contact/messages/${msg.id}/reply`, { reply })).data,
    onSuccess: () => { onSent(); onClose() },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/40 dark:bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white dark:bg-[#0f172a] p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Reply to {msg.senderName}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Original message */}
        <div className="mb-4 rounded-xl border border-slate-200 dark:border-white/8 bg-white/5 px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Badge {...(CAT_META[msg.category] ?? { label: msg.category, color: 'bg-slate-500/15 text-slate-300 ring-slate-500/30' })} />
            <span className="text-xs text-slate-500">{msg.createdAt}</span>
          </div>
          <p className="text-sm text-slate-300 line-clamp-3">{msg.message}</p>
        </div>

        {error && <p className="mb-3 text-xs text-rose-400">{error}</p>}

        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Your Reply *</span>
          <textarea rows={4} value={reply} onChange={e => setReply(e.target.value)}
            placeholder="Type your reply..."
            className="w-full rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-500 resize-none" />
        </label>

        <div className="mt-4 flex gap-3">
          <button type="button" disabled={!reply.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-semibold text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 transition-all shadow-lg shadow-indigo-500/20">
            {mutation.isPending ? 'Sending...' : '✉️ Send Reply'}
          </button>
          <button type="button" onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function AdminContact() {
  const queryClient = useQueryClient()
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher'>('all')
  const [catFilter, setCatFilter] = useState('all')
  const [replyMsg, setReplyMsg] = useState<InboxMessage | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['contactMessages'],
    queryFn: async () => {
      const res = await http.get('/contact/messages')
      console.log('[AdminContact] messages:', res.data)
      return res.data as { messages: InboxMessage[] }
    },
  })
  const all = data?.messages ?? []

  // Stats
  const total = all.length
  const pending = all.filter(m => m.status === 'pending').length
  const today = new Date().toISOString().slice(0, 10)
  const resolvedToday = all.filter(m => m.status === 'resolved' && m.createdAt === today).length

  // Filtered
  const filtered = all.filter(m => {
    if (roleFilter !== 'all' && m.senderRole !== roleFilter) return false
    if (catFilter !== 'all' && m.category !== catFilter) return false
    return true
  })

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-white">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-200 dark:border-white/8 bg-white/3 backdrop-blur-sm px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg shadow-lg shadow-indigo-500/25">
              🎛
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Admin Control Center</h1>
              <p className="text-xs text-slate-400 mt-0.5">Manage all communication and resolve issues efficiently</p>
            </div>
          </div>
          {/* Admin info */}
          <div className="hidden lg:flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>✉️ admin@school.com</span>
            <span>🕐 Mon–Sat | 9AM–5PM</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Messages', value: total, color: 'from-indigo-50 to-purple-50 border-indigo-200 dark:from-indigo-600/20 dark:to-purple-600/20 dark:border-indigo-500/20', text: 'text-indigo-300' },
            { label: 'Pending Issues', value: pending, color: 'from-amber-50 to-orange-50 border-amber-200 dark:from-amber-600/20 dark:to-orange-600/20 dark:border-amber-500/20', text: 'text-amber-300' },
            { label: 'Resolved Today', value: resolvedToday, color: 'from-emerald-50 to-teal-50 border-emerald-200 dark:from-emerald-600/20 dark:to-teal-600/20 dark:border-emerald-500/20', text: 'text-emerald-300' },
          ].map(s => (
            <div key={s.label}
              className={`rounded-2xl border bg-gradient-to-br ${s.color} p-4 transition-all hover:scale-[1.02] hover:shadow-lg`}>
              <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-1">
            {(['all', 'student', 'teacher'] as const).map(r => (
              <button key={r} type="button" onClick={() => setRoleFilter(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  roleFilter === r
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}>
                {r === 'all' ? '👥 All' : r === 'student' ? '🎓 Students' : '👨‍🏫 Teachers'}
              </button>
            ))}
          </div>

          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="h-9 rounded-xl border border-white/10 bg-white dark:bg-[#0f172a] px-3 text-xs text-slate-200 outline-none focus:border-indigo-500">
            <option value="all">All Categories</option>
            <option value="complaint">🚨 Complaint</option>
            <option value="query">❓ Query</option>
            <option value="request">📋 Request</option>
            <option value="technical">🔧 Technical</option>
            <option value="student_issue">👤 Student Issue</option>
            <option value="other">💬 Other</option>
          </select>

          <span className="ml-auto text-xs text-slate-500">{filtered.length} message{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Inbox */}
        <div className="space-y-3">
          {isLoading && <p className="text-sm text-slate-500">Loading messages...</p>}
          {!isLoading && filtered.length === 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-white/8 bg-white/5 p-8 text-center text-sm text-slate-500">
              No messages found.
            </div>
          )}
          {filtered.map(m => {
            const catMeta = CAT_META[m.category] ?? { label: m.category, color: 'bg-slate-500/15 text-slate-300 ring-slate-500/30' }
            const isPending = m.status === 'pending'
            return (
              <div key={m.id}
                className="rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/5 p-4 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-white/8 hover:scale-[1.002] hover:shadow-md hover:shadow-indigo-500/5">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {/* Sender role badge */}
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                    m.senderRole === 'teacher'
                      ? 'bg-violet-500/15 text-violet-300 ring-violet-500/30'
                      : 'bg-sky-500/15 text-sky-300 ring-sky-500/30'
                  }`}>
                    {m.senderRole === 'teacher' ? '👨‍🏫 Teacher' : '🎓 Student'}
                  </span>
                  <Badge {...catMeta} />
                  {/* Status */}
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                    isPending
                      ? 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                  }`}>
                    {isPending ? '⏳ Pending' : '✓ Resolved'}
                  </span>
                  <span className="ml-auto text-xs text-slate-500">{m.createdAt}</span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {m.senderName}
                      {m.senderRole === 'student' && m.teacherName !== '—' && (
                        <span className="ml-2 text-xs font-normal text-slate-500">→ {m.teacherName}</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-400 line-clamp-2">{m.message}</p>
                    {m.adminReply && (
                      <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                        <span className="text-xs font-semibold text-emerald-400">Admin Reply: </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300">{m.adminReply}</span>
                      </div>
                    )}
                  </div>
                  <button type="button"
                    onClick={() => setReplyMsg(m)}
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      isPending
                        ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-500/20'
                        : 'border border-white/10 text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}>
                    {isPending ? '✉️ Reply' : '✏️ Edit Reply'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Admin info footer */}
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 px-5 py-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <span className="text-slate-400 text-xs">Email</span>
              <div className="text-indigo-400 font-semibold">admin@school.com</div>
            </div>
            <div>
              <span className="text-slate-400 text-xs">Office Hours</span>
              <div className="text-slate-200 font-semibold">Mon–Sat | 9AM–5PM</div>
            </div>
            <div className="text-xs text-slate-500 italic">For urgent issues, contact directly.</div>
          </div>
        </div>

      </div>

      {replyMsg && (
        <ReplyModal
          msg={replyMsg}
          onClose={() => setReplyMsg(null)}
          onSent={() => queryClient.invalidateQueries({ queryKey: ['contactMessages'] })}
        />
      )}
    </div>
  )
}

// ── Teacher Support View ───────────────────────────────────────────────────
type StudentOption = { id: string; name: string; className: string | null }

function SearchableStudentSelect({ value, onChange, students, loading }: {
  value: string; onChange: (id: string, name: string) => void
  students: StudentOption[]; loading: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const selected = students.find(s => s.id === value)
  const filtered = query.trim()
    ? students.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : students

  return (
    <div className="relative">
      <span className="text-xs font-medium text-slate-400 block mb-1.5">
        Select Student * {loading && <span className="text-slate-500 dark:text-slate-500">(loading...)</span>}
      </span>
      <input
        type="text"
        value={open ? query : (selected ? `${selected.name}${selected.className ? ` — Class ${selected.className}` : ''}` : '')}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { setQuery(''); setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Type to search student..."
        className="h-10 w-full rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-500 transition-colors"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-white/10 bg-white dark:bg-[#0f172a] shadow-xl max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">No students found</div>
          ) : (
            filtered.map(s => (
              <button key={s.id} type="button"
                onMouseDown={() => { onChange(s.id, s.name); setQuery(''); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-indigo-600/20 transition-colors">
                {s.name}
                {s.className && <span className="ml-2 text-xs text-slate-500">Class {s.className}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function TeacherContact() {
  const [tab, setTab] = useState<'admin' | 'student'>('admin')

  // Use teacher-accessible /students endpoint
  const studentsQuery = useQuery({
    queryKey: ['studentsList'],
    queryFn: async () => (await http.get('/students')).data as { students: StudentOption[] },
  })
  const students = studentsQuery.data?.students ?? []

  const myMsgQuery = useQuery({
    queryKey: ['teacherMessages'],
    queryFn: async () => (await http.get('/contact/teacher-messages')).data as { messages: { id: string; message: string; category: string; createdAt: string }[] },
  })
  const myMessages = myMsgQuery.data?.messages ?? []

  // Contact Admin form
  const [aCategory, setACategory] = useState('technical')
  const [aMessage, setAMessage] = useState('')
  const [aSuccess, setASuccess] = useState(false)

  // Student Issue form
  const [sStudentId, setSStudentId] = useState('')
  const [sIssueType, setSIssueType] = useState('not_attending')
  const [sDesc, setSDesc] = useState('')
  const [sSuccess, setSSuccess] = useState(false)
  const [sError, setSError] = useState('')

  const adminMutation = useMutation({
    mutationFn: async () => (await http.post('/contact/teacher', { category: aCategory, message: aMessage.trim() })).data,
    onSuccess: () => {
      setAMessage(''); setASuccess(true); myMsgQuery.refetch()
      setTimeout(() => setASuccess(false), 4000)
    },
  })

  const issueMutation = useMutation({
    mutationFn: async () => {
      const payload = { studentId: sStudentId, issueType: sIssueType, description: sDesc.trim() }
      console.log('FORM DATA:', payload)
      if (!payload.studentId) throw new Error('Please select a student')
      if (!payload.description) throw new Error('Description is required')
      return (await http.post('/contact/student-issue', payload)).data
    },
    onSuccess: () => {
      setSStudentId(''); setSDesc(''); setSSuccess(true); setSError(''); myMsgQuery.refetch()
      setTimeout(() => setSSuccess(false), 4000)
    },
    onError: (e: any) => setSError(e?.response?.data?.message ?? e?.message ?? 'Failed'),
  })

  const catMeta: Record<string, { label: string; color: string }> = {
    technical:     { label: '🔧 Technical Issue', color: 'bg-blue-500/15 text-blue-300 ring-blue-500/30' },
    student_issue: { label: '👤 Student Issue',   color: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' },
    request:       { label: '📋 Request',         color: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
    other:         { label: '💬 Other',           color: 'bg-slate-500/15 text-slate-300 ring-slate-500/30' },
    complaint:     { label: '🚨 Complaint',       color: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' },
    query:         { label: '❓ Query',           color: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30' },
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-white">
      <div className="border-b border-slate-200 dark:border-slate-200 dark:border-white/8 bg-white/3 backdrop-blur-sm px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg shadow-lg shadow-indigo-500/25">🛠</div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Teacher Support</h1>
            <p className="text-xs text-slate-400 mt-0.5">Contact admin or report student issues 💬</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

        {/* Tab switcher */}
        <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-1 w-fit">
          {([
            { key: 'admin', label: '📩 Contact Admin' },
            { key: 'student', label: '👤 Student Issues' },
          ] as const).map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                tab === t.key
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Contact Admin ── */}
        {tab === 'admin' && (
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 backdrop-blur-sm p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Contact Admin</div>
              <div className="text-xs text-slate-500 mt-0.5">Send a request or report an issue to the administration.</div>
            </div>
            {aSuccess && (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                ✓ Message sent to admin successfully.
              </div>
            )}
            <div className="space-y-3">
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Category *</span>
                <select value={aCategory} onChange={e => setACategory(e.target.value)}
                  className="h-10 w-full rounded-xl border border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 transition-colors">
                  <option value="technical">🔧 Technical Issue</option>
                  <option value="student_issue">👤 Student Issue</option>
                  <option value="request">📋 Request</option>
                  <option value="other">💬 Other</option>
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Description *</span>
                <textarea rows={4} value={aMessage} onChange={e => setAMessage(e.target.value)}
                  placeholder="Describe your issue or request in detail..."
                  className="w-full rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-500 transition-colors resize-none" />
              </label>
              <div className="flex items-center gap-3 pt-1">
                <button type="button" disabled={!aMessage.trim() || adminMutation.isPending}
                  onClick={() => adminMutation.mutate()}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 transition-all shadow-lg shadow-indigo-500/20">
                  {adminMutation.isPending ? 'Sending...' : '📩 Send to Admin'}
                </button>
                {adminMutation.isError && (
                  <span className="text-xs text-rose-400">{(adminMutation.error as any)?.response?.data?.message ?? 'Failed'}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Student Issues ── */}
        {tab === 'student' && (
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 backdrop-blur-sm p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Report Student Issue</div>
              <div className="text-xs text-slate-500 mt-0.5">Report will be sent to admin with student details.</div>
            </div>
            {sSuccess && (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                ✓ Issue reported to admin successfully.
              </div>
            )}
            {sError && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {sError}
              </div>
            )}
            <div className="space-y-3">
              <SearchableStudentSelect
                value={sStudentId}
                onChange={(id) => setSStudentId(id)}
                students={students}
                loading={studentsQuery.isLoading}
              />
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Issue Type *</span>
                <select value={sIssueType} onChange={e => setSIssueType(e.target.value)}
                  className="h-10 w-full rounded-xl border border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 transition-colors">
                  <option value="not_attending">🚫 Not Attending</option>
                  <option value="misbehavior">⚠️ Misbehavior</option>
                  <option value="assignment_not_submitted">📝 Assignment Not Submitted</option>
                  <option value="other">💬 Other</option>
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Description *</span>
                <textarea rows={4} value={sDesc} onChange={e => setSDesc(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  className="w-full rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-500 transition-colors resize-none" />
              </label>
              <div className="flex items-center gap-3 pt-1">
                <button type="button"
                  disabled={!sStudentId || !sDesc.trim() || issueMutation.isPending}
                  onClick={() => { setSError(''); issueMutation.mutate() }}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 transition-all shadow-lg shadow-indigo-500/20">
                  {issueMutation.isPending ? 'Reporting...' : '👤 Report Issue'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── My Requests / Messages ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">📨 My Requests & Messages</span>
            <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300">{myMessages.length}</span>
          </div>
          {myMsgQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : myMessages.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/8 bg-white/5 p-6 text-center text-sm text-slate-500">No messages sent yet.</div>
          ) : (
            <div className="space-y-3">
              {myMessages.map(m => {
                const meta = catMeta[m.category] ?? { label: m.category, color: 'bg-slate-500/15 text-slate-300 ring-slate-500/30' }
                return (
                  <div key={m.id}
                    className="rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/5 p-4 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-white/8 hover:scale-[1.005] hover:shadow-md hover:shadow-indigo-500/5">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${meta.color}`}>{meta.label}</span>
                      <span className="ml-auto text-xs text-slate-500">{m.createdAt}</span>
                    </div>
                    <p className="text-sm text-slate-200 line-clamp-2">{m.message}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Entry ──────────────────────────────────────────────────────────────────
export default function Contact() {
  const { user } = useAuthStore()
  if (user?.role === 'admin') return <AdminContact />
  if (user?.role === 'student') return <StudentContact />
  return <TeacherContact />
}
