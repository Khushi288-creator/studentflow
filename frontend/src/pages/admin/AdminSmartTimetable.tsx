import React, { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'

type Period = {
  periodNumber: number
  label: string
  startTime: string
  endTime: string
  timeSlot: string
}

type Subject = {
  name: string
  teacherId: string | null
  teacherName: string | null
}

type TimetableSlot = {
  day: string
  periodNumber: number
  timeSlot: string
  subject: string
}

const CLASSES = ['4', '5', '6', '7', '8']

export default function AdminSmartTimetable() {
  const qc = useQueryClient()
  const [selectedClass, setSelectedClass] = useState('4')
  const [timetableGrid, setTimetableGrid] = useState<Record<string, Record<number, string>>>({})
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // Fetch pre-generated periods
  const { data: periodsData, isLoading: periodsLoading } = useQuery({
    queryKey: ['smartPeriods'],
    queryFn: async () => (await http.get('/timetable/smart/periods')).data as { periods: Period[]; days: string[] },
  })

  // Fetch subjects for selected class
  const { data: subjectsData } = useQuery({
    queryKey: ['classSubjects', selectedClass],
    queryFn: async () => (await http.get(`/subjects/class/${selectedClass}`)).data as { class: number; subjects: Subject[] },
  })

  // Fetch existing timetable for selected class
  const { data: existingData, isLoading: existingLoading } = useQuery({
    queryKey: ['smartTimetable', selectedClass],
    queryFn: async () => (await http.get(`/timetable/smart/class/${selectedClass}`)).data as { timetable: Record<string, Record<string, any>> },
  })

  // Load existing timetable into grid
  useEffect(() => {
    if (existingData && periodsData) {
      const grid: Record<string, Record<number, string>> = {}
      
      for (const day of periodsData.days) {
        grid[day] = {}
        for (const period of periodsData.periods) {
          const existing = existingData.timetable[day]?.[period.timeSlot]
          grid[day][period.periodNumber] = existing?.subject || ''
        }
      }
      
      setTimetableGrid(grid)
    }
  }, [existingData, periodsData])

  // Initialize empty grid when class changes
  useEffect(() => {
    if (periodsData && !existingLoading) {
      const grid: Record<string, Record<number, string>> = {}
      for (const day of periodsData.days) {
        grid[day] = {}
        for (const period of periodsData.periods) {
          if (!timetableGrid[day]?.[period.periodNumber]) {
            grid[day][period.periodNumber] = ''
          } else {
            grid[day][period.periodNumber] = timetableGrid[day][period.periodNumber]
          }
        }
      }
      setTimetableGrid(grid)
    }
  }, [selectedClass, periodsData])

  const saveMut = useMutation({
    mutationFn: async () => {
      // Build timetable array
      const timetable: TimetableSlot[] = []
      
      if (!periodsData) return
      
      for (const day of periodsData.days) {
        for (const period of periodsData.periods) {
          const subject = timetableGrid[day]?.[period.periodNumber]
          if (subject) {
            timetable.push({
              day,
              periodNumber: period.periodNumber,
              timeSlot: period.timeSlot,
              subject,
            })
          }
        }
      }
      
      return (await http.post('/timetable/smart/save', {
        class: selectedClass,
        timetable,
      })).data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['smartTimetable', selectedClass] })
      qc.invalidateQueries({ queryKey: ['timetable'] })
      showToast(data.message || 'Timetable saved successfully!')
      setValidationErrors([])
    },
    onError: (e: any) => {
      const errorMsg = e?.response?.data?.message || 'Failed to save timetable'
      showToast(errorMsg, false)
      setValidationErrors([errorMsg])
    },
  })

  const handleSubjectChange = (day: string, periodNumber: number, subject: string) => {
    setTimetableGrid(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [periodNumber]: subject,
      },
    }))
    setValidationErrors([])
  }

  const validateTimetable = () => {
    const errors: string[] = []
    
    if (!periodsData) return errors
    
    // Check for empty slots
    let emptyCount = 0
    for (const day of periodsData.days) {
      for (const period of periodsData.periods) {
        if (!timetableGrid[day]?.[period.periodNumber]) {
          emptyCount++
        }
      }
    }
    
    if (emptyCount > 0) {
      errors.push(`${emptyCount} empty slot(s) found. Please fill all slots before saving.`)
    }
    
    // Check for repeated subjects per day
    for (const day of periodsData.days) {
      const subjectCount: Record<string, number> = {}
      for (const period of periodsData.periods) {
        const subject = timetableGrid[day]?.[period.periodNumber]
        if (subject) {
          subjectCount[subject] = (subjectCount[subject] || 0) + 1
        }
      }
      
      for (const [subject, count] of Object.entries(subjectCount)) {
        if (count > 2) {
          errors.push(`"${subject}" appears ${count} times on ${day}. Maximum 2 per day.`)
        }
      }
    }
    
    return errors
  }

  const handleSave = () => {
    const errors = validateTimetable()
    if (errors.length > 0) {
      setValidationErrors(errors)
      showToast('Please fix validation errors', false)
      return
    }
    saveMut.mutate()
  }

  const clearTimetable = () => {
    if (confirm('Clear entire timetable for this class? This cannot be undone.')) {
      const grid: Record<string, Record<number, string>> = {}
      if (periodsData) {
        for (const day of periodsData.days) {
          grid[day] = {}
          for (const period of periodsData.periods) {
            grid[day][period.periodNumber] = ''
          }
        }
      }
      setTimetableGrid(grid)
      setValidationErrors([])
    }
  }

  const periods = periodsData?.periods || []
  const days = periodsData?.days || []
  const subjects = subjectsData?.subjects || []
  const isLoading = periodsLoading || existingLoading

  // Get subject count per day for validation display
  const getSubjectCountForDay = (day: string, subject: string) => {
    let count = 0
    for (const period of periods) {
      if (timetableGrid[day]?.[period.periodNumber] === subject) {
        count++
      }
    }
    return count
  }

  return (
    <Page 
      title="Smart Timetable Builder" 
      subtitle="Build complete class timetable with auto-assigned teachers"
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearTimetable}
            className="rounded-2xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMut.isPending}
            className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saveMut.isPending ? 'Saving...' : 'Save Timetable'}
          </button>
        </div>
      }
    >
      {toast && (
        <div className={`fixed top-20 right-6 z-50 rounded-2xl border px-5 py-3 shadow-2xl text-sm font-semibold ${
          toast.ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
        }`}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20">
          <CardBody>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-rose-700 dark:text-rose-300 mb-2">Validation Errors</h3>
                <ul className="space-y-1 text-sm text-rose-600 dark:text-rose-400">
                  {validationErrors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Class Selector */}
        <div className="lg:col-span-2 space-y-2">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Select Class
          </div>
          {CLASSES.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedClass(c)}
              className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                selectedClass === c
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              Class {c}
            </button>
          ))}
          
          {/* Legend */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Rules
            </div>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div>✓ Fill all slots</div>
              <div>✓ Max 2 same subject/day</div>
              <div>✓ Teacher auto-assigned</div>
            </div>
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="lg:col-span-10">
          <Card>
            <CardHeader
              title={`Class ${selectedClass} Timetable`}
              subtitle="Assign subjects to each period - teachers will be auto-assigned"
            />
            <CardBody className="overflow-x-auto">
              {isLoading ? (
                <div className="py-8 text-center text-sm text-slate-500">Loading periods...</div>
              ) : periods.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500 mb-3">No periods configured.</p>
                  <p className="text-xs text-slate-400">Please configure school timing first in School Config.</p>
                </div>
              ) : (
                <table className="min-w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 dark:border-slate-700">
                      <th className="py-3 pr-4 font-semibold text-slate-600 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-950 z-10">
                        Day / Period
                      </th>
                      {periods.map(period => (
                        <th key={period.periodNumber} className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-300 text-center min-w-[180px]">
                          <div>{period.label}</div>
                          <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                            {period.startTime} - {period.endTime}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map(day => (
                      <tr key={day} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/5">
                        <td className="py-3 pr-4 font-semibold text-indigo-600 dark:text-indigo-400 sticky left-0 bg-white dark:bg-slate-950">
                          {day}
                        </td>
                        {periods.map(period => {
                          const currentSubject = timetableGrid[day]?.[period.periodNumber] || ''
                          const subjectCount = currentSubject ? getSubjectCountForDay(day, currentSubject) : 0
                          const isOverLimit = subjectCount > 2
                          
                          return (
                            <td key={period.periodNumber} className="py-2 px-3">
                              <select
                                value={currentSubject}
                                onChange={(e) => handleSubjectChange(day, period.periodNumber, e.target.value)}
                                className={`w-full h-10 rounded-xl border px-3 text-sm outline-none focus:border-indigo-500 ${
                                  !currentSubject 
                                    ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/20 text-slate-500' 
                                    : isOverLimit
                                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                <option value="">Select subject...</option>
                                {subjects.map(s => (
                                  <option key={s.name} value={s.name}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                              {currentSubject && subjectCount > 1 && (
                                <div className={`text-[10px] mt-1 ${isOverLimit ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                                  {subjectCount}x today {isOverLimit && '⚠️'}
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          {/* Info Card */}
          <Card className="mt-4">
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {periods.length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Periods per Day</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {days.length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">School Days</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {subjects.length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Available Subjects</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </Page>
  )
}
