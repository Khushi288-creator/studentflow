import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { http } from '../../api/http'
import { QRCodeSVG } from 'qrcode.react'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import TeacherBioCard from './components/TeacherBioCard'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Course = { id: string; name: string }
type QRResponse = { token: string; attendanceDate: string }
type TimetableEntry = { id: string; type: string; class: string; subject: string; date?: string; time: string }
type TeacherSummary = {
  totalStudents: number
  subjects: string[]
  totalAssignments: number
  submittedCount: number
  pendingCount: number
  attendance: { present: number; absent: number; late: number }
  avgMarks: number | null
  weakStudents: { userId: string; name: string; avg: number }[]
  marksTrend: { label: string; value: number }[]
}

function Empty({ text = 'No data available yet' }: { text?: string }) {
  return <p className="text-xs text-slate-400 dark:text-slate-500">{text}</p>
}

export default function TeacherDashboard() {
  const [qrOpen, setQrOpen] = useState(false)
  const [qr, setQr] = useState<QRResponse | null>(null)
  const [timetableTab, setTimetableTab] = useState<'regular' | 'exam'>('regular')

  // Fetch teacher's own courses — auto-populated from admin assignment
  const { data: courses } = useQuery({
    queryKey: ['teacherCourses'],
    queryFn: async () => (await http.get('/courses?scope=teacher')).data as { courses: Course[] },
  })
  const courseList = courses?.courses ?? []
  // Auto-select first subject for QR (no manual selection needed)
  const [qrCourseId, setQrCourseId] = useState('')
  const activeCourseId = qrCourseId || courseList[0]?.id || ''

  const summaryQuery = useQuery({
    queryKey: ['teacherSummary'],
    queryFn: async () => (await http.get('/dashboard/teacher/summary')).data as TeacherSummary,
    retry: false,
  })
  const s = summaryQuery.data

  const timetableQuery = useQuery({
    queryKey: ['timetable'],
    queryFn: async () => (await http.get('/timetable')).data as { entries: TimetableEntry[] },
    retry: false,
  })
  const timetableEntries = (timetableQuery.data?.entries ?? []).filter(e => e.type === timetableTab)

  const generateQrMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const res = await http.post('/attendance/qr/generate', { courseId })
      return res.data as QRResponse
    },
    onSuccess: (d) => { setQr(d); setQrOpen(true) },
  })

  return (
    <Page title="Dashboard" subtitle="Classroom overview"
      actions={
        <>
          <Link to="/assignments"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-50">
            Assignments
          </Link>
          <Link to="/results"
            className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Results
          </Link>
        </>
      }>

      {/* Row 1: Bio + Class Overview */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TeacherBioCard />
        </div>
        <Card className="lg:col-span-2">
          <CardHeader title="Class Overview" subtitle="Real-time class data" />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                <div className="text-xs text-slate-500">Total Students</div>
                <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">{s ? s.totalStudents : '—'}</div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                <div className="text-xs text-slate-500">My Subjects</div>
                <div className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {courseList.length ? courseList.map(c => c.name).join(', ') : '—'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                <div className="text-xs text-slate-500">Assignments</div>
                <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">{s ? s.totalAssignments : '—'}</div>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Pending Submissions</span>
                <span className="text-xl font-bold text-amber-700 dark:text-amber-300">{s ? s.pendingCount : '—'}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Submitted</span>
                <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{s ? s.submittedCount : '—'}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Row 2: Performance Analytics */}
      <div className="grid gap-4">
        <Card>
          <CardHeader title="Performance Analytics"
            subtitle={s?.avgMarks != null ? `Class Average: ${s.avgMarks}%` : 'No data yet'} />
          <CardBody>
            {s?.marksTrend && s.marksTrend.some(t => t.value > 0) ? (
              <div style={{ height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={s.marksTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <Empty text="No marks data yet" />}
            {s?.weakStudents && s.weakStudents.length > 0 && (
              <div className="mt-3">
                <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Weak Students (below 60%)</div>
                <div className="space-y-1.5">
                  {s.weakStudents.map(st => (
                    <div key={st.userId} className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 dark:bg-rose-950/20">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{st.name}</span>
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-300">{st.avg}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Row 3: Timetable */}
      <Card>
        <CardHeader title="Timetable & Exams" subtitle="View-only — managed by Admin" />
        <CardBody>
          <div className="mb-4 flex gap-2">
            {(['regular', 'exam'] as const).map(tab => (
              <button key={tab} type="button" onClick={() => setTimetableTab(tab)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  timetableTab === tab ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                }`}>
                {tab === 'regular' ? 'Regular Timetable' : 'Exam Timetable'}
              </button>
            ))}
          </div>
          {timetableQuery.isLoading ? <p className="text-xs text-slate-500">Loading...</p>
          : timetableEntries.length === 0 ? <Empty text={`No ${timetableTab} timetable yet.`} />
          : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 pr-6 font-semibold text-slate-600 dark:text-slate-300">Subject</th>
                    <th className="py-2 pr-6 font-semibold text-slate-600 dark:text-slate-300">Class</th>
                    <th className="py-2 pr-6 font-semibold text-slate-600 dark:text-slate-300">Time</th>
                    {timetableTab === 'exam' && <th className="py-2 font-semibold text-slate-600 dark:text-slate-300">Date</th>}
                  </tr>
                </thead>
                <tbody>
                  {timetableEntries.map(e => (
                    <tr key={e.id} className="border-b border-slate-100 dark:border-slate-900/60">
                      <td className="py-3 pr-6 font-medium text-slate-900 dark:text-slate-50">{e.subject}</td>
                      <td className="py-3 pr-6 text-slate-600 dark:text-slate-300">Class {e.class}</td>
                      <td className="py-3 pr-6 text-slate-600 dark:text-slate-300">{e.time}</td>
                      {timetableTab === 'exam' && <td className="py-3 text-slate-600 dark:text-slate-300">{e.date ?? '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

    </Page>
  )
}
