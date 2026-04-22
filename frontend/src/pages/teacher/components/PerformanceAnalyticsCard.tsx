import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../../api/http'
import { Card, CardBody, CardHeader } from '../../../components/ui/Card'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'

type PerformanceData = {
  marksTrend: { label: string; value: number }[]
  avgMarks: number | null
  weakStudents: { userId: string; name: string; avg: number }[]
  attendance: { present: number; absent: number; late: number }
  subjectPerformance: { subject: string; avgMarks: number; totalStudents: number }[]
  gradeDistribution: { grade: string; count: number; percentage: number }[]
  submissionTrend: { week: string; submitted: number; pending: number }[]
}

const COLORS = {
  primary: '#818cf8',
  success: '#22c55e', 
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6'
}

const GRADE_COLORS = {
  'A+': '#22c55e',
  'A': '#84cc16', 
  'B+': '#eab308',
  'B': '#f59e0b',
  'C': '#f97316',
  'F': '#ef4444'
}

function Empty({ text = 'No data available yet' }: { text?: string }) {
  return <p className="text-xs text-slate-400 dark:text-slate-500">{text}</p>
}

export default function PerformanceAnalyticsCard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'grades' | 'submissions'>('overview')

  const { data, isLoading } = useQuery({
    queryKey: ['teacherPerformanceAnalytics'],
    queryFn: async () => (await http.get('/dashboard/teacher/performance-analytics')).data as PerformanceData,
    retry: false,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader title="Performance Analytics" subtitle="Loading..." />
        <CardBody>
          <div className="flex items-center justify-center h-40">
            <div className="text-sm text-slate-500">Loading analytics...</div>
          </div>
        </CardBody>
      </Card>
    )
  }

  const attendanceData = data?.attendance ? [
    { name: 'Present', value: data.attendance.present, color: COLORS.success },
    { name: 'Absent', value: data.attendance.absent, color: COLORS.danger },
    { name: 'Late', value: data.attendance.late, color: COLORS.warning }
  ].filter(item => item.value > 0) : []

  const tabs = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'subjects', label: 'Subjects', icon: '📚' },
    { key: 'grades', label: 'Grades', icon: '🎯' },
    { key: 'submissions', label: 'Submissions', icon: '📝' }
  ] as const

  return (
    <Card>
      <CardHeader 
        title="📈 Performance Analytics"
        subtitle={data?.avgMarks != null ? `Class Average: ${data.avgMarks}%` : 'Comprehensive performance insights'} 
      />
      <CardBody>
        {/* Tab Navigation */}
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Marks Trend */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">📈 Marks Trend (Last 4 Weeks)</h4>
              {data?.marksTrend && data.marksTrend.some(t => t.value > 0) ? (
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.marksTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Average Marks']}
                        labelFormatter={(label) => `Week: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={COLORS.primary} 
                        strokeWidth={3} 
                        dot={{ r: 5, fill: COLORS.primary }} 
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <Empty text="No marks data yet" />}
            </div>

            {/* Attendance Distribution */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">👥 Today's Attendance</h4>
              {attendanceData.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={attendanceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {attendanceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value, 'Students']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {attendanceData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <span className="text-sm font-bold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <Empty text="No attendance data for today" />}
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">📚 Subject-wise Performance</h4>
            {data?.subjectPerformance && data.subjectPerformance.length > 0 ? (
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.subjectPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'avgMarks' ? `${value}%` : value,
                        name === 'avgMarks' ? 'Average Marks' : 'Total Students'
                      ]}
                    />
                    <Bar dataKey="avgMarks" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <Empty text="No subject performance data yet" />}
          </div>
        )}

        {activeTab === 'grades' && (
          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">🎯 Grade Distribution</h4>
            {data?.gradeDistribution && data.gradeDistribution.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.gradeDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        label={({ grade, percentage }) => `${grade} (${percentage}%)`}
                      >
                        {data.gradeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={GRADE_COLORS[entry.grade as keyof typeof GRADE_COLORS] || COLORS.info} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value, 'Students']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {data.gradeDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: GRADE_COLORS[item.grade as keyof typeof GRADE_COLORS] || COLORS.info }} 
                        />
                        <span className="text-sm font-medium">Grade {item.grade}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{item.count}</div>
                        <div className="text-xs text-slate-500">{item.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : <Empty text="No grade distribution data yet" />}
          </div>
        )}

        {activeTab === 'submissions' && (
          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">📝 Assignment Submission Trends</h4>
            {data?.submissionTrend && data.submissionTrend.length > 0 ? (
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.submissionTrend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="submitted" stackId="a" fill={COLORS.success} name="Submitted" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="pending" stackId="a" fill={COLORS.warning} name="Pending" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <Empty text="No submission trend data yet" />}
          </div>
        )}

        {/* Weak Students Section - Always visible */}
        {data?.weakStudents && data.weakStudents.length > 0 && (
          <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
            <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">⚠️ Students Needing Attention (Below 60%)</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.weakStudents.map(student => (
                <div key={student.userId} className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 dark:bg-rose-950/20">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{student.name}</span>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-300">{student.avg}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}