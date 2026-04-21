import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStudentDashboardData } from './useStudentDashboardData'
import StudentBioCard from './components/StudentBioCard'
import AttendancePieCard from './components/AttendancePieCard'
import AssignmentsCard from './components/AssignmentsCard'
import EventsCard from './components/EventsCard'
import TimetableCard from './components/TimetableCard'
import FeesStatusCard from './components/FeesStatusCard'
import AchievementsChartCard from './components/AchievementsChartCard'

type StudentSummary = {
  totalCourses?: number
  pendingAssignments?: number
  attendancePercentage?: number
  feeStatus?: string
  feesPending?: number
  latestResultPct?: number | null
  upcomingExams?: number
  marksTrend?: Array<{ label: string; value: number }>
}

export default function StudentDashboard() {
  const dash = useStudentDashboardData()

  const summaryQuery = useQuery({
    queryKey: ['studentSummary'],
    queryFn: async () => {
      const res = await http.get('/dashboard/student/summary')
      return res.data as StudentSummary
    },
    retry: false,
  })

  const marksTrend = summaryQuery.data?.marksTrend ?? []
  const feesPending = summaryQuery.data?.feesPending ?? 0
  const latestResultPct = summaryQuery.data?.latestResultPct ?? null

  return (
    <Page
      title="Dashboard"
      subtitle="Everything in one view"
      className="flex h-full min-h-0 flex-col space-y-3"
      actions={
        <>
          <Link
            to="/profile"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-all hover:shadow-sm dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-50"
          >
            🚀 Student Hub
          </Link>
          <Link to="/events" className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-500/20">
            Events
          </Link>
        </>
      }
    >
      {/* Quick info banners */}
      {(feesPending > 0 || latestResultPct !== null) && (
        <div className="flex flex-wrap gap-2">
          {feesPending > 0 && (
            <Link to="/fees"
              className="flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-4 py-2 text-sm font-semibold text-amber-400 hover:from-amber-500/20 hover:to-orange-500/20 transition-all shadow-sm shadow-amber-500/10 dark:border-amber-500/30">
              ⚠ Fees Pending: ₹{feesPending}
            </Link>
          )}
          {latestResultPct !== null && (
            <Link to="/results"
              className="flex items-center gap-2 rounded-2xl border border-indigo-400/40 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-4 py-2 text-sm font-semibold text-indigo-400 hover:from-indigo-500/20 hover:to-purple-500/20 transition-all shadow-sm shadow-indigo-500/10 dark:border-indigo-500/30">
              📊 Latest Result: {latestResultPct}%
            </Link>
          )}
        </div>
      )}
      <div className="grid flex-1 min-h-0 gap-4 md:grid-cols-2 lg:grid-cols-12">

        {/* ── Row 1: Bio · Attendance · Performance ── */}
        <div className="lg:col-span-4 min-h-0 transition-transform duration-200 hover:scale-[1.01]">
          <StudentBioCard authUser={dash.authUser} student={dash.student} />
        </div>

        <div className="lg:col-span-4 min-h-0 transition-transform duration-200 hover:scale-[1.01]">
          <AttendancePieCard
            loading={dash.queries.attendanceQuery.isLoading && dash.computed.attendance.present + dash.computed.attendance.absent + dash.computed.attendance.late === 0}
            hasError={false}
            present={dash.computed.attendance.present}
            absent={dash.computed.attendance.absent}
            lateOrHalfDay={dash.computed.attendance.late}
          />
        </div>

        <div className="lg:col-span-4 min-h-0 transition-transform duration-200 hover:scale-[1.01]">
          <Card className="h-full min-h-0 overflow-hidden">
            <CardHeader title="Performance" subtitle="Recent assignment performance" />
            <CardBody className="min-h-0">
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  {marksTrend.length ? (
                    <LineChart data={marksTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.9)' }} />
                      <Line type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2.5} dot={{ r: 3, fill: '#818cf8' }} />
                    </LineChart>
                  ) : (
                    <div className="flex h-full items-center justify-center text-[11px] text-slate-500 dark:text-slate-400">
                      {summaryQuery.isLoading ? 'Loading…' : 'No performance data yet'}
                    </div>
                  )}
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* ── Row 2: Assignments · Holidays/Events ── */}
        <div className="lg:col-span-6 min-h-0 transition-transform duration-200 hover:scale-[1.01]">
          <AssignmentsCard
            loading={dash.queries.assignmentsQuery.isLoading}
            hasError={dash.queries.assignmentsQuery.isError}
            assignments={dash.computed.assignments}
          />
        </div>

        <div className="lg:col-span-6 min-h-0 transition-transform duration-200 hover:scale-[1.01]">
          <EventsCard
            loading={dash.queries.eventsQuery.isLoading}
            hasError={dash.queries.eventsQuery.isError}
            events={dash.computed.events}
          />
        </div>

        {/* ── Row 3: Achievements Chart · Fees ── */}
        <div className="lg:col-span-8 min-h-0 transition-transform duration-200 hover:scale-[1.01]">
          <AchievementsChartCard />
        </div>

        <div className="lg:col-span-4 min-h-0 transition-transform duration-200 hover:scale-[1.01]">
          <FeesStatusCard
            loading={dash.queries.feesQuery.isLoading}
            hasError={dash.queries.feesQuery.isError}
            totals={dash.computed.feeTotals}
          />
        </div>

        {/* ── Row 4: Timetable (full width) ── */}
        <div className="lg:col-span-12 min-h-0 transition-transform duration-200 hover:scale-[1.005]">
          <TimetableCard
            regular={dash.computed.regularTimetable}
            exams={dash.computed.examTimetable}
            regularLoading={dash.queries.regularTimetableQuery.isLoading}
            examLoading={dash.queries.examTimetableQuery.isLoading}
            regularError={dash.queries.regularTimetableQuery.isError}
            examError={dash.queries.examTimetableQuery.isError}
          />
        </div>

      </div>
    </Page>
  )
}

