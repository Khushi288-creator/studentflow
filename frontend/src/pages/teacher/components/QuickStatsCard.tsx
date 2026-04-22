import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../../api/http'
import { Card, CardBody, CardHeader } from '../../../components/ui/Card'

type QuickStats = {
  totalStudents: number
  avgAttendance: number
  assignmentsGraded: number
  avgClassPerformance: number
  topPerformer: { name: string; score: number } | null
  improvementNeeded: number
}

export default function QuickStatsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['teacherQuickStats'],
    queryFn: async () => (await http.get('/dashboard/teacher/quick-stats')).data as QuickStats,
    retry: false,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader title="📊 Quick Stats" subtitle="Loading..." />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="animate-pulse rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                <div className="h-4 bg-slate-200 rounded dark:bg-slate-700 mb-2"></div>
                <div className="h-6 bg-slate-200 rounded dark:bg-slate-700"></div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    )
  }

  const stats = [
    {
      label: 'Total Students',
      value: data?.totalStudents || 0,
      icon: '👥',
      color: 'bg-blue-500',
      textColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'Avg Attendance',
      value: `${data?.avgAttendance || 0}%`,
      icon: '📅',
      color: 'bg-green-500',
      textColor: 'text-green-600 dark:text-green-400'
    },
    {
      label: 'Assignments Graded',
      value: data?.assignmentsGraded || 0,
      icon: '✅',
      color: 'bg-purple-500',
      textColor: 'text-purple-600 dark:text-purple-400'
    },
    {
      label: 'Class Average',
      value: `${data?.avgClassPerformance || 0}%`,
      icon: '📈',
      color: 'bg-orange-500',
      textColor: 'text-orange-600 dark:text-orange-400'
    }
  ]

  return (
    <Card>
      <CardHeader title="📊 Quick Stats" subtitle="At a glance overview" />
      <CardBody>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={index} className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center text-white text-sm`}>
                  {stat.icon}
                </div>
                <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
              </div>
              <div className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Additional insights */}
        {data && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.topPerformer && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🏆</span>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Top Performer</span>
                </div>
                <div className="text-sm text-emerald-800 dark:text-emerald-200">
                  <span className="font-medium">{data.topPerformer.name}</span> - {data.topPerformer.score}%
                </div>
              </div>
            )}
            
            {data.improvementNeeded > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">⚠️</span>
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Need Attention</span>
                </div>
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  {data.improvementNeeded} student{data.improvementNeeded > 1 ? 's' : ''} below 60%
                </div>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}