import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { useAuthStore } from '../../store/authStore'
import { useModalClose } from '../../hooks/useModalClose'

type TeacherData = {
  subject?: string; phone?: string; address?: string
  bloodType?: string; birthday?: string; sex?: string; photoUrl?: string
}
type Summary = {
  totalStudents: number; subjects: string[]
  totalAssignments: number; submittedCount: number
  attendance: { present: number; absent: number; late: number }
  avgMarks: number | null
}
type Activity = {
  lastAttendance: { date: string; subject: string } | null
  lastAssignment: { title: string; subject: string; date: string } | null
}
type TimetableEntry = { id: string; type: string; class: string; subject: string; date?: string; time: string }

// ── Glassmorphism card ─────────────────────────────────────────────────────
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 backdrop-blur-sm p-5 ${className}`}>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{children}</div>
}

function Val({ v }: { v?: string | null }) {
  return <span className="text-sm font-medium text-slate-100">{v?.trim() || '—'}</span>
}

function StatBox({ label, value, color = 'text-indigo-400' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  )
}

// ── Edit Profile Modal ─────────────────────────────────────────────────────
function EditModal({ teacher, onClose }: { teacher: TeacherData; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [form, setForm] = useState({
    phone: teacher.phone ?? '',
    address: teacher.address ?? '',
    bloodType: teacher.bloodType ?? '',
    birthday: teacher.birthday ?? '',
    sex: teacher.sex ?? '',
  })

  useModalClose(true, onClose)

  const mutation = useMutation({
    mutationFn: async () => (await http.put(`/admin/teachers/${user!.id}`, form)).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teacherMe'] }); onClose() },
  })

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/40 dark:bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white dark:bg-[#0f172a] p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Edit Profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="grid gap-3">
          {[
            { label: 'Phone', key: 'phone' as const, type: 'text', placeholder: '10-digit number' },
            { label: 'Address', key: 'address' as const, type: 'text', placeholder: 'Full address' },
            { label: 'Birthday', key: 'birthday' as const, type: 'date', placeholder: '' },
          ].map(({ label, key, type, placeholder }) => (
            <label key={key} className="grid gap-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
              <input value={form[key]} onChange={f(key)} type={type} placeholder={placeholder}
                className="h-10 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 text-sm text-white outline-none focus:border-indigo-500" />
            </label>
          ))}
          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Blood Type</span>
            <select value={form.bloodType} onChange={f('bloodType')}
              className="h-10 rounded-xl border border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm text-white outline-none focus:border-indigo-500">
              <option value="">Select...</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Gender</span>
            <select value={form.sex} onChange={f('sex')}
              className="h-10 rounded-xl border border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm text-white outline-none focus:border-indigo-500">
              <option value="">Select...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </label>
        </div>
        <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}
          className="mt-5 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ── Change Password Modal ──────────────────────────────────────────────────
function PasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useModalClose(true, onClose)

  const mutation = useMutation({
    mutationFn: async () => {
      // Use forgot-password flow: get reset token then reset
      const { user } = useAuthStore.getState()
      const r1 = await http.post('/auth/forgot-password', { email: user!.email })
      await http.post('/auth/reset-password', { token: r1.data.resetToken, newPassword: newPwd })
    },
    onSuccess: () => { setSuccess(true); setTimeout(onClose, 1500) },
    onError: () => setError('Failed to change password'),
  })

  const submit = () => {
    if (newPwd.length < 6) { setError('Min 6 characters'); return }
    if (newPwd !== confirm) { setError('Passwords do not match'); return }
    setError(''); mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/40 dark:bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white dark:bg-[#0f172a] p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Change Password</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        {error && <div className="mb-3 rounded-xl bg-rose-950/50 px-3 py-2 text-xs text-rose-400">{error}</div>}
        {success && <div className="mb-3 rounded-xl bg-emerald-950/50 px-3 py-2 text-xs text-emerald-400">Password updated!</div>}
        <div className="grid gap-3">
          {[
            { label: 'New Password', val: newPwd, set: setNewPwd },
            { label: 'Confirm Password', val: confirm, set: setConfirm },
          ].map(({ label, val, set }) => (
            <label key={label} className="grid gap-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
              <input value={val} onChange={e => set(e.target.value)} type="password" placeholder="Min 6 characters"
                className="h-10 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 text-sm text-white outline-none focus:border-indigo-500" />
            </label>
          ))}
        </div>
        <button type="button" disabled={mutation.isPending} onClick={submit}
          className="mt-5 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {mutation.isPending ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function TeacherProfile() {
  const { user } = useAuthStore()
  const [showEdit, setShowEdit] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const { data: teacherData } = useQuery({
    queryKey: ['teacherMe'],
    queryFn: async () => (await http.get('/teachers/me')).data as { teacher: TeacherData | null },
    retry: false,
  })

  const { data: summaryData } = useQuery({
    queryKey: ['teacherSummary'],
    queryFn: async () => (await http.get('/dashboard/teacher/summary')).data as Summary,
    retry: false,
  })

  const { data: activityData } = useQuery({
    queryKey: ['teacherActivity'],
    queryFn: async () => (await http.get('/teachers/me/activity')).data as Activity,
    retry: false,
  })

  const { data: timetableData } = useQuery({
    queryKey: ['timetable'],
    queryFn: async () => (await http.get('/timetable')).data as { entries: TimetableEntry[] },
    retry: false,
  })

  const { data: coursesData } = useQuery({
    queryKey: ['teacherCourses'],
    queryFn: async () => (await http.get('/courses?scope=teacher')).data as { courses: { id: string; name: string }[] },
    retry: false,
  })

  const t = teacherData?.teacher
  const s = summaryData
  const a = activityData
  const courses = coursesData?.courses ?? []
  const today = new Date().toISOString().slice(0, 10)
  const todayEntries = (timetableData?.entries ?? []).filter(e => e.type === 'regular')
  const upcomingExams = (timetableData?.entries ?? []).filter(e => e.type === 'exam' && (e.date ?? '') >= today)

  const totalAttendance = (s?.attendance.present ?? 0) + (s?.attendance.absent ?? 0) + (s?.attendance.late ?? 0)
  const attendancePct = totalAttendance > 0
    ? Math.round((s!.attendance.present / totalAttendance) * 100)
    : 0

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Teacher Profile</h1>
          <p className="text-xs text-slate-400 mt-0.5">Your complete teaching overview</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowEdit(true)}
            className="rounded-xl border border-indigo-500/50 bg-indigo-600/20 px-4 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-600/40 transition">
            ✏ Edit Profile
          </button>
          <button type="button" onClick={() => setShowPwd(true)}
            className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 transition">
            🔒 Change Password
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6 space-y-5">

        {/* Row 1: Basic Info + Stats */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Basic Info */}
          <GlassCard className="lg:col-span-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-full border-2 border-indigo-500/50 bg-indigo-600/20 flex items-center justify-center text-2xl font-bold text-indigo-300">
                {user?.name?.charAt(0).toUpperCase() ?? 'T'}
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{user?.name ?? '—'}</div>
                <div className="text-xs text-indigo-400 font-semibold">Teacher</div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Email', value: user?.email },
                { label: 'Phone', value: t?.phone },
                { label: 'Gender', value: t?.sex },
                { label: 'Blood Type', value: t?.bloodType },
                { label: 'Birthday', value: t?.birthday },
                { label: 'Address', value: t?.address },
              ].map(row => (
                <div key={row.label}>
                  <Label>{row.label}</Label>
                  {row.label === 'Email' && row.value
                    ? <a href={`mailto:${row.value}`} className="text-sm text-indigo-400 hover:underline">{row.value}</a>
                    : <Val v={row.value} />}
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Teaching Stats */}
          <GlassCard className="lg:col-span-2">
            <div className="text-sm font-semibold text-slate-300 mb-4">Teaching Stats</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatBox label="Total Students" value={s?.totalStudents ?? '—'} color="text-indigo-400" />
              <StatBox label="Assignments" value={s?.totalAssignments ?? '—'} color="text-violet-400" />
              <StatBox label="Attendance %" value={s ? `${attendancePct}%` : '—'} color="text-emerald-400" />
              <StatBox label="Avg Marks" value={s?.avgMarks != null ? `${s.avgMarks}%` : '—'} color="text-amber-400" />
            </div>

            {/* Subjects & Classes */}
            <div className="mt-5">
              <div className="text-sm font-semibold text-slate-300 mb-3">Subjects & Classes</div>
              {courses.length === 0 ? (
                <p className="text-xs text-slate-500">No subjects assigned yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {courses.map(c => (
                    <span key={c.id} className="rounded-xl border border-indigo-500/30 bg-indigo-600/10 px-3 py-1.5 text-xs font-semibold text-indigo-300">
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance breakdown */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/20 p-3 text-center">
                <div className="text-xl font-bold text-emerald-400">{s?.attendance.present ?? 0}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Present</div>
              </div>
              <div className="rounded-xl bg-rose-950/40 border border-rose-500/20 p-3 text-center">
                <div className="text-xl font-bold text-rose-400">{s?.attendance.absent ?? 0}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Absent</div>
              </div>
              <div className="rounded-xl bg-amber-950/40 border border-amber-500/20 p-3 text-center">
                <div className="text-xl font-bold text-amber-400">{s?.attendance.late ?? 0}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Late</div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Row 2: Timetable + Recent Activity */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Timetable */}
          <GlassCard>
            <div className="text-sm font-semibold text-slate-300 mb-4">Timetable & Schedule</div>
            <div className="mb-3">
              <div className="text-xs font-semibold text-indigo-400 uppercase mb-2">Regular Classes</div>
              {todayEntries.length === 0 ? (
                <p className="text-xs text-slate-500">No regular timetable entries.</p>
              ) : (
                <div className="space-y-2">
                  {todayEntries.slice(0, 4).map(e => (
                    <div key={e.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{e.subject}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Class {e.class}</div>
                      </div>
                      <span className="rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-2 py-1 text-xs font-semibold text-indigo-300">
                        {e.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-violet-400 uppercase mb-2">Upcoming Exams</div>
              {upcomingExams.length === 0 ? (
                <p className="text-xs text-slate-500">No upcoming exams.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingExams.slice(0, 3).map(e => (
                    <div key={e.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{e.subject}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Class {e.class}</div>
                      </div>
                      <span className="rounded-lg bg-violet-600/20 border border-violet-500/30 px-2 py-1 text-xs font-semibold text-violet-300">
                        {e.date ?? e.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Recent Activity */}
          <GlassCard>
            <div className="text-sm font-semibold text-slate-300 mb-4">Recent Activity</div>
            <div className="space-y-4">
              <div className="rounded-xl border border-white/5 bg-white dark:bg-white/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400 uppercase">Last Attendance Marked</span>
                </div>
                {a?.lastAttendance ? (
                  <>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{a.lastAttendance.subject}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{a.lastAttendance.date}</div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">No attendance marked yet.</p>
                )}
              </div>

              <div className="rounded-xl border border-white/5 bg-white dark:bg-white/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-400 uppercase">Last Assignment Uploaded</span>
                </div>
                {a?.lastAssignment ? (
                  <>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{a.lastAssignment.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{a.lastAssignment.subject} · {a.lastAssignment.date}</div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">No assignments uploaded yet.</p>
                )}
              </div>

              <div className="rounded-xl border border-white/5 bg-white dark:bg-white/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 uppercase">Submissions Pending Review</span>
                </div>
                <div className="text-2xl font-bold text-amber-400">{s?.submittedCount ?? 0}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">total submissions received</div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {showEdit && t && <EditModal teacher={t} onClose={() => setShowEdit(false)} />}
      {showPwd && <PasswordModal onClose={() => setShowPwd(false)} />}
    </div>
  )
}
