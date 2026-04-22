import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import TeacherBioCard from './components/TeacherBioCard'
import PerformanceAnalyticsCard from './components/PerformanceAnalyticsCard'
import QuickStatsCard from './components/QuickStatsCard'

type Course = { id: string; name: string }
type TimetableEntry = { id: string; type: string; class: string; subject: string; date?: string; time: string }
type EventRow = { id: string; title: string; description: string; date: string; time?: string }
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
type SalaryDashRow = { id: string; monthName: string; year: number; netSalary: number; status: string; paidAt: string | null }

function Empty({ text = 'No data available yet' }: { text?: string }) {
  return <p className="text-xs text-slate-400 dark:text-slate-500">{text}</p>
}

export default function TeacherDashboard() {
  const [timetableTab, setTimetableTab] = useState<'regular' | 'exam'>('regular')

  const { data: courses } = useQuery({
    queryKey: ['teacherCourses'],
    queryFn: async () => (await http.get('/courses?scope=teacher')).data as { courses: Course[] },
  })
  const courseList = courses?.courses ?? []

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

  const salaryDashQuery = useQuery({
    queryKey: ['mySalaryDash'],
    queryFn: async () => (await http.get('/salary/me')).data as { salaries: SalaryDashRow[] },
    retry: false,
  })
  const salaries = (salaryDashQuery.data?.salaries ?? []).slice(0, 6)
  const recentPaid = salaries.find(s => s.status === 'paid')

  const eventsQuery = useQuery({
    queryKey: ['teacherUpcomingEvents'],
    queryFn: async () => (await http.get('/events/upcoming')).data as { events: EventRow[] },
    retry: false,
    refetchInterval: 30000,
  })
  const upcomingEvents = eventsQuery.data?.events ?? []

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

      {/* Row 1: Bio + Quick Stats */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TeacherBioCard />
        </div>
        <div className="lg:col-span-2">
          <QuickStatsCard />
        </div>
      </div>

      {/* Row 2: Class Overview */}
      <Card>
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

      {/* Row 3: Enhanced Performance Analytics */}
      <PerformanceAnalyticsCard />

      {/* Row 4: Salary Notification + History */}
      <Card>
        <CardHeader title="💰 Salary" subtitle="Last 6 months" />
        <CardBody>
          {recentPaid && (
            <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
              💰 Salary received: ₹{recentPaid.netSalary.toLocaleString('en-IN')} on {recentPaid.paidAt ?? recentPaid.monthName + ' ' + recentPaid.year}
            </div>
          )}
          {salaryDashQuery.isLoading ? <p className="text-xs text-slate-500">Loading...</p>
          : salaries.length === 0 ? <p className="text-xs text-slate-500">No salary records yet.</p>
          : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 pr-4 text-xs font-semibold text-slate-500">Period</th>
                    <th className="py-2 pr-4 text-xs font-semibold text-slate-500">Net Salary</th>
                    <th className="py-2 text-xs font-semibold text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {salaries.map(sal => (
                    <tr key={sal.id} className="border-b border-slate-100 dark:border-slate-900/60">
                      <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{sal.monthName} {sal.year}</td>
                      <td className="py-2 pr-4 font-semibold text-indigo-600 dark:text-indigo-300">₹{sal.netSalary.toLocaleString('en-IN')}</td>
                      <td className="py-2">
                        {sal.status === 'paid'
                          ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">✓ Paid</span>
                          : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">⏳ Pending</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Row 5: Events */}
      <Card>
        <CardHeader title="🎉 Upcoming Events" subtitle="Latest 5 school events" />
        <CardBody>
          {eventsQuery.isLoading ? <p className="text-xs text-slate-500">Loading...</p>
          : upcomingEvents.length === 0 ? <p className="text-xs text-slate-500">No upcoming events.</p>
          : (
            <div className="space-y-3">
              {upcomingEvents.map(e => (
                <div key={e.id} className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-lg dark:bg-indigo-950/40">🎉</div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{e.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{e.description}</div>
                    <div className="text-xs text-indigo-500 mt-0.5">{e.date}{e.time ? ` · ${e.time}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Row 6: Timetable */}
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
