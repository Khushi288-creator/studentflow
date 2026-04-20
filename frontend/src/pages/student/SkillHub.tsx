import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { QRCodeSVG } from 'qrcode.react'

type Faculty = { id: string; name: string; salaryType: string; salaryAmount: number }
type Activity = {
  id: string; name: string; description: string; duration: string; fees: number
  scheduleDays: string; scheduleTime: string; targetClass: string; capacity: number | null
  level: string; batch: string; icon: string; faculty: Faculty | null
  enrolledCount: number; isEnrolled: boolean; paymentStatus: string | null; myRating: number | null
}

const LEVEL_COLOR: Record<string, string> = {
  Beginner:     'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  Intermediate: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  Advanced:     'bg-rose-500/15 text-rose-300 ring-rose-500/30',
}
const BATCH_COLOR: Record<string, string> = {
  Morning: 'bg-sky-500/15 text-sky-300',
  Evening: 'bg-violet-500/15 text-violet-300',
}

function formatSchedule(days: string, time: string) {
  const d = days ? days.split(',').join(', ') : ''
  const t = time ? ` • 🕒 ${time}` : ''
  return d + t
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="text-lg transition-transform hover:scale-110">
          <span className={(hover || value) >= n ? 'text-amber-400' : 'text-slate-600'}>★</span>
        </button>
      ))}
    </div>
  )
}

export default function SkillHub() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'all'|'enrolled'|'available'>('all')
  const [qrActId, setQrActId] = useState<string|null>(null)
  const [enrolledMsg, setEnrolledMsg] = useState<string|null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['skillActivities'],
    queryFn: async () => (await http.get('/skill-hub/activities')).data as { activities: Activity[] },
  })

  const enrollMut = useMutation({
    mutationFn: async (activityId: string) => (await http.post(`/skill-hub/activities/${activityId}/enroll`)).data,
    onSuccess: (_d, activityId) => {
      qc.invalidateQueries({ queryKey: ['skillActivities'] })
      setQrActId(null)
      setEnrolledMsg(activityId)
      setTimeout(() => setEnrolledMsg(null), 4000)
    },
  })

  const rateMut = useMutation({
    mutationFn: async ({ activityId, rating }: { activityId: string; rating: number }) =>
      (await http.post(`/skill-hub/activities/${activityId}/rate`, { rating })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skillActivities'] }),
  })

  const activities = data?.activities ?? []
  const filtered = activities.filter(a => {
    if (filter === 'enrolled') return a.isEnrolled
    if (filter === 'available') return !a.isEnrolled
    return true
  })

  const enrolledCount = activities.filter(a => a.isEnrolled).length

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-white">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-200 dark:border-white/8 bg-white dark:bg-white/80 dark:bg-white/3 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg shadow-lg shadow-indigo-500/25">🎯</div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Skill Hub</h1>
            <p className="text-xs text-slate-400 mt-0.5">Explore &amp; enroll in extra activities</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Activities', value: activities.length, color: 'from-indigo-50 to-purple-50 border-indigo-200 dark:from-indigo-600/20 dark:to-purple-600/20 dark:border-indigo-500/20', text: 'text-indigo-300' },
            { label: 'My Enrollments', value: enrolledCount, color: 'from-emerald-50 to-teal-50 border-emerald-200 dark:from-emerald-600/20 dark:to-teal-600/20 dark:border-emerald-500/20', text: 'text-emerald-300' },
            { label: 'Available', value: activities.length - enrolledCount, color: 'from-violet-50 to-pink-50 border-violet-200 dark:from-violet-600/20 dark:to-pink-600/20 dark:border-violet-500/20', text: 'text-violet-300' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border bg-gradient-to-br ${s.color} p-4 transition-all hover:scale-[1.02]`}>
              <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-1 w-fit">
          {([
            { key: 'all',       label: '🌐 All' },
            { key: 'enrolled',  label: '✅ Enrolled' },
            { key: 'available', label: '🆕 Available' },
          ] as const).map(t => (
            <button key={t.key} type="button" onClick={() => setFilter(t.key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                filter === t.key ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Success banner */}
        {enrolledMsg && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 flex items-center gap-3">
            <span className="text-xl">🎉</span>
            <div>
              <div className="text-sm font-semibold text-emerald-300">Successfully Enrolled!</div>
              <div className="text-xs text-emerald-400/80">
                This is a demo enrollment. In production, payment would be processed via UPI/QR.
              </div>
            </div>
          </div>
        )}

        {/* Activity cards */}
        {isLoading && <p className="text-sm text-slate-500">Loading activities...</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(a => (
            <div key={a.id}
              className={`rounded-2xl border p-5 flex flex-col gap-3 transition-all hover:scale-[1.01] hover:shadow-xl ${
                a.isEnrolled
                  ? 'border-indigo-500/30 bg-indigo-500/5 hover:shadow-indigo-500/10'
                  : 'border-white/10 bg-white/5 hover:bg-slate-100 dark:hover:bg-white/8 hover:shadow-white/5'
              }`}>
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">{a.icon}</span>
                  <div>
                    <div className="font-bold text-white text-sm leading-tight">{a.name}</div>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${LEVEL_COLOR[a.level] ?? 'bg-slate-500/15 text-slate-300 ring-slate-500/30'}`}>
                        {a.level}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${BATCH_COLOR[a.batch] ?? 'bg-slate-500/15 text-slate-300'}`}>
                        {a.batch}
                      </span>
                    </div>
                  </div>
                </div>
                {a.isEnrolled && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 shrink-0 ring-1 ring-emerald-500/30">
                    ✓ Enrolled
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{a.description}</p>

              {/* Details */}
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                {a.faculty && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 dark:text-slate-500">👨‍🏫</span>
                    <span>{a.faculty.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-slate-500">📅</span>
                  <span>{formatSchedule(a.scheduleDays, a.scheduleTime)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-slate-500">⏱</span>
                  <span>{a.duration}</span>
                </div>
                {a.targetClass !== 'All Classes' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 dark:text-slate-500">🎓</span>
                    <span>{a.targetClass}</span>
                  </div>
                )}
                {a.capacity && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 dark:text-slate-500">👥</span>
                    <span>{a.enrolledCount}/{a.capacity} seats filled</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                <span className="text-xl font-bold text-emerald-400">
                  ₹{Number(a.fees || 0).toLocaleString('en-IN')}
                  <span className="text-xs font-normal text-slate-500">/mo</span>
                </span>
                {!a.isEnrolled ? (
                  <button type="button"
                    onClick={() => setQrActId(a.id)}
                    className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1.5 text-xs font-bold text-white hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-500/20 transition-all hover:scale-105">
                    Enroll Now
                  </button>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-slate-500">Rate this activity</span>
                    <StarRating
                      value={a.myRating ?? 0}
                      onChange={rating => rateMut.mutate({ activityId: a.id, rating })}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          {!isLoading && filtered.length === 0 && (
            <div className="col-span-3 rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-slate-500">
              {filter === 'enrolled' ? "You haven't enrolled in any activities yet." : 'No activities available.'}
            </div>
          )}
        </div>
      </div>

      {/* ── Enroll QR Modal ── */}
      {qrActId && (() => {
        const act = activities.find(a => a.id === qrActId)
        if (!act) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/40 dark:bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setQrActId(null)}>
            <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white dark:bg-[#0f172a] p-6 shadow-2xl text-center"
              onClick={e => e.stopPropagation()}>
              <div className="text-3xl mb-2">{act.icon}</div>
              <h2 className="text-lg font-bold text-white mb-0.5">{act.name}</h2>
              <p className="text-xs text-slate-400 mb-5">Scan to pay &amp; enroll</p>

              <div className="flex justify-center mb-4">
                <div className="rounded-2xl bg-white p-3 shadow-lg">
                  <QRCodeSVG
                    value={`upi://pay?pa=demo@upi&pn=SkillHub&am=${act.fees}&tn=Enrollment:${act.name}`}
                    size={160}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-white/8 bg-white/5 px-4 py-3 mb-5 text-left space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-slate-400"><span>Activity</span><span className="text-white font-medium">{act.name}</span></div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400"><span>Amount</span><span className="text-emerald-400 font-bold">₹{Number(act.fees || 0).toLocaleString('en-IN')}/month</span></div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400"><span>Schedule</span><span className="text-slate-900 dark:text-white">{formatSchedule(act.scheduleDays, act.scheduleTime)}</span></div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300 mb-5">
                🎓 Demo mode — click "Confirm Enrollment" to enroll directly without payment.
              </div>

              <div className="flex gap-2">
                <button type="button"
                  disabled={enrollMut.isPending}
                  onClick={() => enrollMut.mutate(act.id)}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-bold text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 transition-all shadow-lg shadow-indigo-500/20">
                  {enrollMut.isPending ? 'Enrolling...' : '✓ Confirm Enrollment'}
                </button>
                <button type="button" onClick={() => setQrActId(null)}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5">
                  Cancel
                </button>
              </div>
              {enrollMut.isError && (
                <p className="mt-2 text-xs text-rose-400">{(enrollMut.error as any)?.response?.data?.message ?? 'Failed'}</p>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
