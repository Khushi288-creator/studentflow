import React, { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { http } from '../../api/http'
import { useAuthStore } from '../../store/authStore'

type DoubtRow = {
  id: string
  subject: string
  question: string
  status: 'open' | 'answered'
  teacherReply?: string
  createdAt: string
  studentName?: string
  className?: string | null
}

type AchievementRow = {
  id: string
  title: string
  type: 'achievement' | 'activity'
  rank: string | null
  date: string | null
}

// ── Glass card wrapper ─────────────────────────────────────────────────────
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 backdrop-blur-sm p-5 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/5 ${className}`}>
      {children}
    </div>
  )
}

function SectionTitle({ icon, title, count }: { icon: string; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</span>
      {count !== undefined && (
        <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300">{count}</span>
      )}
    </div>
  )
}

// ── Doubt Card ─────────────────────────────────────────────────────────────
function DoubtCard({ doubt, canReply, onReply }: {
  doubt: DoubtRow; canReply: boolean; onReply: (r: string) => void
}) {
  const [reply, setReply] = useState('')
  const answered = doubt.status === 'answered'

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/5 p-4 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-white/8">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          answered
            ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
            : 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'
        }`}>
          {answered ? '✓ Answered' : '⏳ Pending'}
        </span>
        {doubt.subject && (
          <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300 ring-1 ring-indigo-500/30">
            {doubt.subject}
          </span>
        )}
        <span className="ml-auto text-xs text-slate-500">{doubt.createdAt}</span>
      </div>

      {doubt.studentName && (
        <div className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {doubt.studentName}{doubt.className ? ` · Class ${doubt.className}` : ''}
        </div>
      )}

      <div className="text-sm font-medium text-slate-100">{doubt.question}</div>

      {doubt.teacherReply && (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5">
          <div className="text-xs font-semibold text-emerald-400 mb-1">Teacher Reply</div>
          <div className="text-sm text-slate-700 dark:text-slate-200">{doubt.teacherReply}</div>
        </div>
      )}

      {canReply && !answered && (
        <div className="mt-3 space-y-2">
          <textarea rows={2} value={reply} onChange={e => setReply(e.target.value)}
            placeholder="Write your reply..."
            className="w-full rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-500" />
          <button type="button" disabled={!reply.trim()}
            onClick={() => { onReply(reply); setReply('') }}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors">
            Reply
          </button>
        </div>
      )}
    </div>
  )
}

// ── Achievement Card ───────────────────────────────────────────────────────
function AchievCard({ row }: { row: AchievementRow }) {
  const rankColors: Record<string, string> = {
    '1st': 'text-amber-400 bg-amber-500/10 ring-amber-500/30',
    '2nd': 'text-slate-300 bg-slate-500/10 ring-slate-500/30',
    '3rd': 'text-orange-400 bg-orange-500/10 ring-orange-500/30',
  }
  const isAchievement = row.type === 'achievement'

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/5 p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:shadow-indigo-500/10 hover:bg-slate-100 dark:hover:bg-white/8">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xl">{isAchievement ? '🏆' : '📘'}</span>
        {row.rank && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${rankColors[row.rank] ?? 'text-slate-300 bg-slate-500/10 ring-slate-500/30'}`}>
            {row.rank}
          </span>
        )}
      </div>
      <div className="text-sm font-semibold text-slate-100 leading-snug">{row.title}</div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          isAchievement
            ? 'bg-indigo-500/20 text-indigo-300'
            : 'bg-emerald-500/20 text-emerald-300'
        }`}>
          {isAchievement ? 'Achievement' : 'Activity'}
        </span>
        {row.date && <span className="text-xs text-slate-500">{row.date}</span>}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Profile() {
  const { user } = useAuthStore()
  const isStudent = user?.role === 'student'
  const canReply = user?.role === 'teacher' || user?.role === 'admin'

  const [subject, setSubject] = useState('')
  const [question, setQuestion] = useState('')

  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => (await http.get('/subjects')).data as { subjects: string[] },
    enabled: isStudent,
  })
  const subjects = subjectsQuery.data?.subjects ?? []

  const doubtsQuery = useQuery({
    queryKey: ['doubts'],
    queryFn: async () => (await http.get('/doubts')).data as { doubts: DoubtRow[] },
  })
  const doubts = doubtsQuery.data?.doubts ?? []

  const achievementsQuery = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => (await http.get('/achievements')).data as { achievements: AchievementRow[] },
    enabled: isStudent,
  })
  const achievements = achievementsQuery.data?.achievements ?? []

  const submitMutation = useMutation({
    mutationFn: async (body: { subject: string; question: string }) =>
      (await http.post('/doubts', body)).data,
    onSuccess: () => { doubtsQuery.refetch(); setSubject(''); setQuestion('') },
  })

  const replyMutation = useMutation({
    mutationFn: async ({ doubtId, reply }: { doubtId: string; reply: string }) =>
      (await http.post(`/doubts/${doubtId}/reply`, { reply })).data,
    onSuccess: () => doubtsQuery.refetch(),
  })

  const open = doubts.filter(d => d.status === 'open')
  const answered = doubts.filter(d => d.status === 'answered')

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-white">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-200 dark:border-white/8 bg-white/3 backdrop-blur-sm px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg shadow-lg shadow-indigo-500/25">
              🚀
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Student Hub</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {isStudent
                  ? 'Ask doubts, track progress, and grow smarter 🚀'
                  : canReply
                    ? 'View and reply to student doubts'
                    : 'Student learning center'}
              </p>
            </div>
            <div className="ml-auto rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-indigo-500/30">
              {user?.role?.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* ── Ask a Doubt (student only) ── */}
        {isStudent && (
          <GlassCard>
            <SectionTitle icon="💬" title="Ask a Doubt" />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Subject *</span>
                <select value={subject} onChange={e => setSubject(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 transition-colors">
                  <option value="" className="bg-slate-900">Select subject...</option>
                  {subjects.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Question *</span>
                <input value={question} onChange={e => setQuestion(e.target.value)}
                  placeholder="Type your doubt..."
                  className="h-10 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-500 transition-colors" />
              </label>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button type="button"
                disabled={!subject || !question || submitMutation.isPending}
                onClick={() => submitMutation.mutate({ subject, question })}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 transition-all shadow-lg shadow-indigo-500/20">
                {submitMutation.isPending ? 'Submitting...' : '✦ Ask Doubt'}
              </button>
              {submitMutation.isSuccess && (
                <span className="text-xs text-emerald-400">Doubt submitted! Teacher will reply soon.</span>
              )}
              {submitMutation.isError && (
                <span className="text-xs text-rose-400">{(submitMutation.error as any)?.response?.data?.message ?? 'Failed'}</span>
              )}
            </div>
          </GlassCard>
        )}

        {/* ── My Doubts ── */}
        <div>
          {/* Pending */}
          <GlassCard className="mb-4">
            <SectionTitle icon="⏳" title="Pending Doubts" count={open.length} />
            {open.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                {isStudent ? 'No pending doubts. Ask one above!' : 'No pending doubts from students.'}
              </p>
            ) : (
              <div className="space-y-3">
                {open.map(d => (
                  <DoubtCard key={d.id} doubt={d} canReply={canReply}
                    onReply={reply => replyMutation.mutate({ doubtId: d.id, reply })} />
                ))}
              </div>
            )}
          </GlassCard>

          {/* Answered */}
          {answered.length > 0 && (
            <GlassCard>
              <SectionTitle icon="✅" title="Answered Doubts" count={answered.length} />
              <div className="space-y-3">
                {answered.map(d => (
                  <DoubtCard key={d.id} doubt={d} canReply={false} onReply={() => {}} />
                ))}
              </div>
            </GlassCard>
          )}
        </div>

        {/* ── Achievements (student only) ── */}
        {isStudent && (
          <GlassCard>
            <SectionTitle icon="🏆" title="My Achievements & Activities" count={achievements.length} />
            {achievements.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No achievements yet. Keep working hard!</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {achievements.map(a => <AchievCard key={a.id} row={a} />)}
              </div>
            )}
          </GlassCard>
        )}

      </div>
    </div>
  )
}
