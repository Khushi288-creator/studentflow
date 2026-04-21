import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useAttendanceStore } from '../store/attendanceStore'
import { useQuery } from '@tanstack/react-query'
import { http } from '../api/http'
import { useModalClose } from '../hooks/useModalClose'

type Role = 'Student' | 'Teacher' | 'Admin'

const ROLE_BADGE: Record<Role, string> = {
  Student: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
  Teacher: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  Admin:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
}

// ── Student Preview — real data if logged in, else static ─────────────────
function StudentPreview() {
  const { user } = useAuthStore()
  const allStoreRecords = useAttendanceStore((s) => s.records)

  // Only fetch if logged in
  const attendanceQuery = useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const res = await http.get('/attendance')
      return res.data as { attendance: { courseId: string; date: string; status: string }[] }
    },
    enabled: !!user,
    retry: false,
  })

  const assignmentsQuery = useQuery({
    queryKey: ['dashboardAssignments'],
    queryFn: async () => {
      const res = await http.get('/assignments', { params: { limit: 3 } })
      return res.data as { assignments: { id: string; title: string; dueDate: string; courseId: string }[] }
    },
    enabled: !!user,
    retry: false,
  })

  // Merge backend + store attendance (same logic as dashboard)
  const backendRows = attendanceQuery.data?.attendance ?? []
  const teacherRows = user?.name
    ? allStoreRecords
        .filter((r) => r.studentName.toLowerCase() === user.name.toLowerCase())
        .map((r) => ({ courseId: r.courseId, date: r.date, status: r.status }))
    : []
  const merged = [...backendRows]
  for (const tr of teacherRows) {
    const idx = merged.findIndex((r) => r.courseId === tr.courseId && r.date === tr.date)
    if (idx >= 0) merged[idx] = tr
    else merged.push(tr)
  }

  const present = merged.filter((r) => r.status === 'present').length
  const absent  = merged.filter((r) => r.status === 'absent').length
  const late    = merged.filter((r) => r.status === 'late' || r.status === 'halfDay').length
  const hasAttendance = merged.length > 0

  const assignments = (assignmentsQuery.data?.assignments ?? []).slice(0, 3)

  // Static fallback when not logged in
  const staticAttendance = [
    { d: 'Mon', s: 'present' }, { d: 'Tue', s: 'present' },
    { d: 'Wed', s: 'absent' },  { d: 'Thu', s: 'present' }, { d: 'Fri', s: 'late' },
  ]
  const staticAssignments = [
    { title: 'Chapter 3 Exercise', sub: 'Mathematics', due: 'Due Tomorrow' },
    { title: 'Lab Report', sub: 'Science', due: 'Due in 3 days' },
    { title: 'Essay Writing', sub: 'English', due: 'Submitted' },
  ]

  return (
    <div className="space-y-3">
      {/* Attendance */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-xs font-semibold text-slate-500 mb-2">
          Attendance {user ? '(Your Data)' : '(Demo)'}
        </div>
        {user && !hasAttendance && !attendanceQuery.isLoading ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">No attendance data yet.</p>
        ) : user && attendanceQuery.isLoading ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading...</p>
        ) : user && hasAttendance ? (
          <>
            <div className="flex gap-3 text-sm font-semibold">
              <span className="text-emerald-600">{present} Present</span>
              <span className="text-rose-500">{absent} Absent</span>
              <span className="text-amber-500">{late} Late</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Total: {merged.length} records</div>
          </>
        ) : (
          <div className="flex gap-1.5">
            {staticAttendance.map((x) => (
              <div key={x.d} className="flex flex-1 flex-col items-center gap-1">
                <div className={`h-8 w-full rounded-lg text-[10px] font-bold flex items-center justify-center
                  ${x.s === 'present' ? 'bg-emerald-100 text-emerald-700' : x.s === 'absent' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                  {x.s === 'present' ? '✓' : x.s === 'absent' ? '✗' : 'L'}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{x.d}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignments */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-xs font-semibold text-slate-500 mb-2">
          Assignments {user ? '(Your Data)' : '(Demo)'}
        </div>
        {user && assignmentsQuery.isLoading ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading...</p>
        ) : user && assignments.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">No assignments yet.</p>
        ) : (
          <div className="space-y-2">
            {(user ? assignments.map((a) => ({
              title: a.title,
              sub: a.courseId,
              due: new Date(a.dueDate).toLocaleDateString(),
            })) : staticAssignments).map((a) => (
              <div key={a.title} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{a.title}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{a.sub}</div>
                </div>
                <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{a.due}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Teacher Preview ────────────────────────────────────────────────────────
function TeacherPreview() {
  const [marked, setMarked] = useState<Record<string, string>>({
    Priya: 'present', Rahul: 'present', Anjali: 'absent', Rohan: '', Meera: 'late',
  })
  const students = ['Priya', 'Rahul', 'Anjali', 'Rohan', 'Meera']
  const statuses = ['present', 'absent', 'late'] as const
  const styleMap = {
    present: 'bg-emerald-100 text-emerald-700 ring-emerald-300',
    absent:  'bg-rose-100 text-rose-600 ring-rose-300',
    late:    'bg-amber-100 text-amber-600 ring-amber-300',
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-slate-500">Mark Attendance — Mathematics</div>
          <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950/40">Today</span>
        </div>
        <div className="space-y-2">
          {students.map((name) => (
            <div key={name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
              <span className="text-xs font-medium text-slate-800 dark:text-slate-100">{name}</span>
              <div className="flex gap-1">
                {statuses.map((st) => (
                  <button key={st} type="button"
                    onClick={() => setMarked(p => ({ ...p, [name]: st }))}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ring-1 transition
                      ${marked[name] === st ? styleMap[st] : 'opacity-30 ring-slate-200 bg-white text-slate-500'}`}>
                    {st[0].toUpperCase() + st.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-3 text-xs">
          <span className="text-emerald-600 font-semibold">{Object.values(marked).filter(v => v === 'present').length} Present</span>
          <span className="text-rose-500 font-semibold">{Object.values(marked).filter(v => v === 'absent').length} Absent</span>
          <span className="text-amber-500 font-semibold">{Object.values(marked).filter(v => v === 'late').length} Late</span>
        </div>
      </div>

      {/* Recent submissions */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-xs font-semibold text-slate-500 mb-2">Recent Submissions</div>
        <div className="space-y-1.5">
          {[
            { name: 'Priya', sub: 'Chapter 3 Exercise', marks: 88 },
            { name: 'Rahul', sub: 'Chapter 3 Exercise', marks: 74 },
            { name: 'Anjali', sub: 'Lab Report', marks: 91 },
          ].map((s) => (
            <div key={s.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5 dark:bg-slate-800/60">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{s.name}</span>
                <span className="ml-2 text-[10px] text-slate-500 dark:text-slate-400">{s.sub}</span>
              </div>
              <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{s.marks}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Admin Preview ──────────────────────────────────────────────────────────
function AdminPreview() {
  const bars = [
    { day: 'Mon', present: 85, absent: 15 },
    { day: 'Tue', present: 90, absent: 10 },
    { day: 'Wed', present: 78, absent: 22 },
    { day: 'Thu', present: 92, absent: 8 },
    { day: 'Fri', present: 88, absent: 12 },
  ]
  return (
    <div className="space-y-3">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { l: 'Students', v: '460', c: 'bg-amber-400' },
          { l: 'Teachers', v: '24', c: 'bg-violet-500' },
          { l: 'Subjects', v: '6', c: 'bg-emerald-500' },
          { l: 'Fees Paid', v: '₹1.2L', c: 'bg-indigo-500' },
        ].map((s) => (
          <div key={s.l} className={`rounded-2xl p-3 text-white ${s.c}`}>
            <div className="text-xl font-bold">{s.v}</div>
            <div className="text-xs opacity-90">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Attendance bar chart */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-xs font-semibold text-slate-500 mb-3">Weekly Attendance Overview</div>
        <div className="flex items-end gap-2 h-20">
          {bars.map((b) => (
            <div key={b.day} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full flex flex-col gap-0.5" style={{ height: 64 }}>
                <div className="w-full rounded-t-md bg-indigo-400" style={{ height: `${b.present * 0.64}%` }} />
                <div className="w-full rounded-b-md bg-amber-300" style={{ height: `${b.absent * 0.64}%` }} />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{b.day}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-400 inline-block" />Present</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-300 inline-block" />Absent</span>
        </div>
      </div>

      {/* Recent notices */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-xs font-semibold text-slate-500 mb-2">Recent Announcements</div>
        <div className="space-y-1.5">
          {[
            { t: 'Exam Schedule Released', d: 'Today' },
            { t: 'Sports Day — April 20', d: 'Yesterday' },
          ].map((n) => (
            <div key={n.t} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5 dark:bg-slate-800/60">
              <span className="text-xs font-medium text-slate-800 dark:text-slate-100">{n.t}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{n.d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Home() {
  const [viewingRole, setViewingRole] = useState<Role | null>(null)
  const [demoOpen, setDemoOpen] = useState(false)
  const [videoOpen, setVideoOpen] = useState(false)

  useModalClose(demoOpen, () => setDemoOpen(false))
  useModalClose(videoOpen, () => setVideoOpen(false))

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-gradient-to-b from-indigo-50/60 to-white dark:border-slate-800 dark:from-indigo-950/30 dark:to-slate-950">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl dark:bg-indigo-500/10" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl dark:bg-cyan-500/10" />

        <div className="relative grid gap-10 px-6 py-12 md:grid-cols-2 md:items-start">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/60 px-3 py-1 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              School Management — Std 4 to 8
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 md:text-5xl">
              Student Management System
            </h1>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              Complete school management for Students, Teachers, and Admins.
              Attendance, assignments, results, fees, events — all in one place.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={() => setDemoOpen(true)}
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700">
                ▶ Try Live Demo
              </button>
              <button type="button" onClick={() => setVideoOpen(true)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:hover:bg-slate-900">
                🎬 Watch Demo
              </button>
              <Link to="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300">
                Login →
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { k: 'JWT', v: 'Secure Auth' },
                { k: 'QR', v: 'Attendance' },
                { k: 'PDF', v: 'Reports' },
              ].map((x) => (
                <div key={x.k} className="rounded-2xl border border-slate-200/60 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <div className="text-xs text-indigo-600">{x.k}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{x.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Demo Preview */}
          <div>
            {viewingRole === null ? (
              /* No role selected yet — show placeholder */
              <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-8 py-16 text-center dark:border-slate-800 dark:bg-slate-950/20">
                <div className="text-4xl mb-3">👆</div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Click "Try Live Demo"</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Select a role to see the dashboard preview</div>
                <button type="button" onClick={() => setDemoOpen(true)}
                  className="mt-5 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                  ▶ Try Live Demo
                </button>
              </div>
            ) : (
              <>
                {/* Now Viewing badge */}
                <div className="mb-3 flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ROLE_BADGE[viewingRole]}`}>
                    Now Viewing: {viewingRole}
                  </span>
                  <button type="button" onClick={() => setDemoOpen(true)}
                    className="text-xs text-indigo-500 hover:underline">
                    change role
                  </button>
                </div>

                <div className="rounded-3xl border border-slate-200/60 bg-slate-50/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
                  {/* Preview header */}
                  <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{viewingRole} Dashboard</span>
                    <span className={`rounded-xl px-2.5 py-0.5 text-xs font-semibold ${ROLE_BADGE[viewingRole]}`}>Preview</span>
                  </div>

                  {/* Role-specific preview */}
                  {viewingRole === 'Student' && <StudentPreview />}
                  {viewingRole === 'Teacher' && <TeacherPreview />}
                  {viewingRole === 'Admin'   && <AdminPreview />}
                </div>

                <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
                  Static demo preview. <Link to="/login" className="text-indigo-500 hover:underline">Login</Link> to access the real system.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Features</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Designed like a real production app.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { title: 'Role-based access', desc: 'Students, teachers, and admins see the right dashboard and actions.' },
            { title: 'JWT authentication', desc: 'Secure login with validation, plus password reset flow.' },
            { title: 'Smart extras', desc: 'QR attendance, PDF downloads, notifications, and real-time updates.' },
          ].map((f) => (
            <div key={f.title} className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/30">
              <div className="font-semibold text-indigo-600">✦</div>
              <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">{f.title}</div>
              <div className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">What users say</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { q: 'Quick dashboards and clean tables. Easy to use on mobile.', a: 'Student' },
            { q: 'QR attendance and assignment creation makes classroom flow faster.', a: 'Teacher' },
            { q: 'Admin reports + notices are simple, structured, and actionable.', a: 'Admin' },
          ].map((t) => (
            <div key={t.a} className="rounded-3xl border border-slate-200/60 bg-white p-6 dark:border-slate-800 dark:bg-slate-950/30">
              <div className="text-sm font-semibold text-indigo-600">"{t.q}"</div>
              <div className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-50">{t.a}</div>
              <div className="mt-1 text-xs text-slate-500">Verified demo</div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 text-center text-xs text-slate-500 dark:text-slate-400">
        Admin creates accounts → Login → Role Dashboard
      </div>

      {/* ── Try Live Demo Modal ── */}
      {demoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/30 dark:bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setDemoOpen(false)}>
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/60 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Select Role to Preview</h2>
              <button onClick={() => setDemoOpen(false)} className="text-xl leading-none text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">✕</button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Preview updates on the same page — no navigation</p>
            <div className="mt-5 grid gap-3">
              {(['Student', 'Teacher', 'Admin'] as Role[]).map((role) => (
                <button key={role} type="button"
                  onClick={() => { setViewingRole(role); setDemoOpen(false) }}
                  className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition
                    ${viewingRole === role
                      ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/40'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800'}`}>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-50">{role}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {role === 'Student' && 'Attendance + assignments preview'}
                      {role === 'Teacher' && 'Attendance marking + submissions preview'}
                      {role === 'Admin'   && 'Analytics + stats overview'}
                    </div>
                  </div>
                  {viewingRole === role && <span className="font-bold text-indigo-600">✓</span>}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              This is a <strong>demo preview only</strong>. To use the real system, login with your account.
            </div>
          </div>
        </div>
      )}

      {/* ── Watch Demo Modal ── */}
      {videoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/30 dark:bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setVideoOpen(false)}>
          <div className="w-full max-w-lg rounded-3xl border border-slate-200/60 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">System Demo</h2>
              <button onClick={() => setVideoOpen(false)} className="text-xl leading-none text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">✕</button>
            </div>
            <div className="mt-4 flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-5xl">🎬</div>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Demo Video</div>
              <div className="px-6 text-center text-xs text-slate-500">
                Full walkthrough of Student, Teacher, and Admin dashboards with all features.
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900">📋 Assignments</div>
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900">📊 Attendance</div>
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900">🔔 Notifications</div>
            </div>
            <button onClick={() => setVideoOpen(false)}
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
