import React, { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'

type Period = { 
  type: string
  label: string
  startTime: string
  endTime: string
  periodNumber?: number
}
type SchoolConfig = {
  startTime: string
  endTime: string
  prayerDuration: number
  breakDuration: number
  breakAfterPeriod: number
  totalMinutes: number
  netMinutes: number
  periodCount: number
  periodDuration: number
  periods: Period[]
}

export default function AdminSchoolConfig() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ 
    startTime: '07:20', 
    endTime: '12:20', 
    prayerDuration: 30,
    breakDuration: 30,
    breakAfterPeriod: 3
  })
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3500)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['schoolConfig'],
    queryFn: async () => (await http.get('/school-config')).data as { config: SchoolConfig },
  })

  // Sync form when data loads
  useEffect(() => {
    if (data?.config) {
      setForm({
        startTime: data.config.startTime,
        endTime: data.config.endTime,
        prayerDuration: data.config.prayerDuration,
        breakDuration: data.config.breakDuration,
        breakAfterPeriod: data.config.breakAfterPeriod,
      })
    }
  }, [data])

  const saveMut = useMutation({
    mutationFn: async () =>
      (await http.put('/school-config', form)).data as { config: SchoolConfig; message: string },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['schoolConfig'] })
      showToast(d.message ?? 'Saved!')
    },
    onError: (e: any) => showToast(e?.response?.data?.message ?? 'Failed', false),
  })

  const config = data?.config

  return (
    <Page title="School Timing" subtitle="Configure school hours and period schedule">
      {toast && (
        <div className={`fixed top-20 right-6 z-50 rounded-2xl border px-5 py-3 shadow-2xl text-sm font-semibold ${
          toast.ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
        }`}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-12">

        {/* Config form */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader title="Timing Configuration" subtitle="Set school hours" />
            <CardBody className="space-y-4">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Start Time</span>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                  className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">End Time</span>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                  className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Prayer Duration (minutes)</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={form.prayerDuration}
                  onChange={e => setForm(p => ({ ...p, prayerDuration: Number(e.target.value) }))}
                  className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400">Fixed at start of school day</span>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Break Duration (minutes)</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={form.breakDuration}
                  onChange={e => setForm(p => ({ ...p, breakDuration: Number(e.target.value) }))}
                  className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Break After Period</span>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={form.breakAfterPeriod}
                  onChange={e => setForm(p => ({ ...p, breakAfterPeriod: Number(e.target.value) }))}
                  className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400">Break will be placed after this period number</span>
              </label>
              <button
                type="button"
                disabled={saveMut.isPending}
                onClick={() => saveMut.mutate()}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saveMut.isPending ? 'Saving...' : 'Save Configuration'}
              </button>
            </CardBody>
          </Card>

          {/* Summary stats */}
          {config && (
            <Card className="mt-4">
              <CardHeader title="Calculated Summary" subtitle="Auto-computed from timing" />
              <CardBody>
                <div className="space-y-2">
                  {[
                    { label: 'Total School Time', value: `${config.totalMinutes} min` },
                    { label: 'Prayer Duration', value: `${config.prayerDuration} min` },
                    { label: 'Break Duration', value: `${config.breakDuration} min` },
                    { label: 'Net Teaching Time', value: `${config.netMinutes} min` },
                    { label: 'Total Periods', value: `${config.periodCount} periods` },
                    { label: 'Period Duration', value: `${config.periodDuration} min each` },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-white/5 px-3 py-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{row.label}</span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">{row.value}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Period schedule table */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader title="Period Schedule" subtitle="Auto-generated from configuration" />
            <CardBody className="overflow-x-auto">
              {isLoading ? (
                <div className="py-6 text-sm text-slate-500">Loading...</div>
              ) : !config?.periods?.length ? (
                <div className="py-6 text-sm text-slate-500">No schedule yet. Save configuration to generate.</div>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="py-2 pr-6 font-semibold text-slate-600 dark:text-slate-300">#</th>
                      <th className="py-2 pr-6 font-semibold text-slate-600 dark:text-slate-300">Period</th>
                      <th className="py-2 pr-6 font-semibold text-slate-600 dark:text-slate-300">Start</th>
                      <th className="py-2 pr-6 font-semibold text-slate-600 dark:text-slate-300">End</th>
                      <th className="py-2 font-semibold text-slate-600 dark:text-slate-300">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.periods.map((p, i) => {
                      const dur = (
                        parseInt(p.endTime.split(':')[0]) * 60 + parseInt(p.endTime.split(':')[1])
                      ) - (
                        parseInt(p.startTime.split(':')[0]) * 60 + parseInt(p.startTime.split(':')[1])
                      )
                      
                      const isPrayer = p.type === 'prayer'
                      const isBreak = p.type === 'break'
                      const isPeriod = p.type === 'period'
                      
                      return (
                        <tr key={i} className={`border-b border-slate-100 dark:border-slate-900/60 ${
                          isPrayer ? 'bg-purple-50/50 dark:bg-purple-950/10' :
                          isBreak ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''
                        }`}>
                          <td className="py-3 pr-6 text-slate-400 text-xs">{i + 1}</td>
                          <td className="py-3 pr-6">
                            {isPrayer ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                                🤲 {p.label}
                              </span>
                            ) : isBreak ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                                ☕ {p.label}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                📚 {p.label}
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-6 font-mono text-sm text-slate-700 dark:text-slate-200">{p.startTime}</td>
                          <td className="py-3 pr-6 font-mono text-sm text-slate-700 dark:text-slate-200">{p.endTime}</td>
                          <td className="py-3 text-xs text-slate-500">{dur} min</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </Page>
  )
}
