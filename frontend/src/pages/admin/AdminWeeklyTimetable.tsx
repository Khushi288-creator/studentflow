import React, { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'

type Slot = {
  type: string
  label: string
  startTime: string
  endTime: string
  timeSlot: string
  periodNumber?: number
  isEditable: boolean
}

type Subject = {
  name: string
  teacherId: string | null
  teacherName: string | null
}

const CLASSES = ['4', '5', '6', '7', '8']

export default function AdminWeeklyTimetable() {
  const qc = useQueryClient()
  const [selectedClass, setSelectedClass] = useState('4')
  const [timetableGrid, setTimetableGrid] = useState<Record<string, Record<string, string>>>({})
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  // Fetch weekly structure
  const { data: structureData, isLoading: structureLoading } = useQuery({
    queryKey: ['weeklyStructure'],
    queryFn: async () => (await http.get('/weekly-timetable/structure')).data as {
      weeklyStructure: Record<string, Slot[]>
      subjectRules: any
      days: string[]
    },
  })

  // Fetch subjects for selected class
  const { data: subjectsData } = useQuery({
    queryKey: ['classSubjects', selectedClass],
    queryFn: async () => (await http.get(`/subjects/class/${selectedClass}`)).data as { class: number; subjects: Subject[] },
  })

  // Fetch existing timetable
  const { data: existingData, isLoading: existingLoading } = useQuery({
    queryKey: ['weeklyTimetable', selectedClass],
    queryFn: async () => (await http.get(`/weekly-timetable/class/${selectedClass}`)).data as { timetable: Record<string, Record<string, any>> },
  })

  // Load existing timetable into grid
  useEffect(() => {
    if (existingData && structureData) {
      const grid: Record<string, Record<string, string>> = {}
      
      for (const day of structureData.days) {
        grid[day] = {}
        for (const slot of structureData.weeklyStructure[day]) {
          if (slot.isEditable) {
            const existing = existingData.timetable[day]?.[slot.timeSlot]
            grid[day][slot.timeSlot] = existing?.subject || ''
          }
        }
      }
      
      setTimetableGrid(grid)
    }
  }, [existingData, structureData])

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!structureData) return
      
      const timetable: any[] = []
      
      for (const day of structureData.days) {
        for (const slot of structureData.weeklyStructure[day]) {
          if (slot.isEditable) {
            const subject = timetableGrid[day]?.[slot.timeSlot]
            if (subject) {
              timetable.push({
                day,
                timeSlot: slot.timeSlot,
                subject,
                slotType: subject.toLowerCase().includes('physical') || subject.toLowerCase() === 'pt' ? 'pt' : 'period',
              })
            }
          }
        }
      }
      
      return (await http.post('/weekly-timetable/save', {
        class: selectedClass,
        timetable,
      })).data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['weeklyTimetable', selectedClass] })
      showToast(data.message || 'Weekly timetable saved successfully!')
      setValidationErrors([])
    },
    onError: (e: any) => {
      const errorMsg = e?.response?.data?.message || 'Failed to save timetable'
      showToast(errorMsg, false)
      setValidationErrors([errorMsg])
    },
  })

  const handleSubjectChange = (day: string, timeSlot: string, subject: string) => {
    setTimetableGrid(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [timeSlot]: subject,
      },
    }))
    setValidationErrors([])
  }

  const clearTimetable = () => {
    if (confirm('Clear entire weekly timetable for this class?')) {
      const grid: Record<string, Record<string, string>> = {}
      if (structureData) {
        for (const day of structureData.days) {
          grid[day] = {}
          for (const slot of structureData.weeklyStructure[day]) {
            if (slot.isEditable) {
              grid[day][slot.timeSlot] = ''
            }
          }
        }
      }
      setTimetableGrid(grid)
      setValidationErrors([])
    }
  }

  const getSlotStyle = (slot: Slot) => {
    if (slot.type === 'prayer') return 'bg-purple-50 dark:bg-purple-950/20'
    if (slot.type === 'yoga') return 'bg-green-50 dark:bg-green-950/20'
    if (slot.type === 'break') return 'bg-amber-50 dark:bg-amber-950/20'
    return ''
  }

  const getSlotBadge = (slot: Slot) => {
    if (slot.type === 'prayer') return '🤲 Prayer'
    if (slot.type === 'yoga') return '🧘 Yoga'
    if (slot.type === 'break') return '☕ Break'
    return slot.label
  }

  const subjects = subjectsData?.subjects || []
  const isLoading = structureLoading || existingLoading
  const days = structureData?.days || []
  const weeklyStructure = structureData?.weeklyStructure || {}

  return (
    <Page
      title="Weekly Timetable Builder"
      subtitle="Build complete weekly schedule with real school logic"
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
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saveMut.isPending ? 'Saving...' : 'Save Weekly Timetable'}
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

      {validationErrors.length > 0 && (
        <Card className="border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20">
          <CardBody>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-rose-700 dark:text-rose-300 mb-2">Validation Errors</h3>
                <div className="text-sm text-rose-600 dark:text-rose-400 whitespace-pre-line">
                  {validationErrors.join('\n')}
                </div>
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
              Legend
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-100 dark:bg-purple-900/30"></div>
                <span className="text-slate-600 dark:text-slate-400">Prayer</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30"></div>
                <span className="text-slate-600 dark:text-slate-400">Yoga (Sat)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-900/30"></div>
                <span className="text-slate-600 dark:text-slate-400">Break</span>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Timetable Grid */}
        <div className="lg:col-span-10">
          <Card>
            <CardHeader
              title={`Class ${selectedClass} - Weekly Timetable`}
              subtitle="Monday-Friday: 7:20-12:20 | Saturday: 7:20-11:00 (with Yoga)"
            />
            <CardBody className="overflow-x-auto">
              {isLoading ? (
                <div className="py-8 text-center text-sm text-slate-500">Loading schedule...</div>
              ) : days.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500 mb-3">No schedule configured.</p>
                  <p className="text-xs text-slate-400">Please configure school timing first.</p>
                </div>
              ) : (
                <table className="min-w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 dark:border-slate-700">
                      <th className="py-3 pr-4 font-semibold text-slate-600 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-950 z-10 min-w-[120px]">
                        Time / Day
                      </th>
                      {days.map(day => (
                        <th key={day} className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-300 text-center min-w-[150px]">
                          {day}
                          {day === 'Saturday' && <div className="text-[10px] font-normal text-slate-400 mt-0.5">Shorter day</div>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Get max slots from any day */}
                    {weeklyStructure[days[0]]?.map((_, slotIndex) => {
                      const firstDaySlot = weeklyStructure[days[0]][slotIndex]
                      const isBreakRow = firstDaySlot.type === 'break'
                      const isPrayerRow = firstDaySlot.type === 'prayer'
                      const isYogaRow = firstDaySlot.type === 'yoga'
                      
                      return (
                        <tr key={slotIndex} className={`border-b border-slate-200 dark:border-slate-800 ${
                          isBreakRow ? 'bg-amber-50/50 dark:bg-amber-950/10' :
                          isPrayerRow ? 'bg-purple-50/50 dark:bg-purple-950/10' :
                          isYogaRow ? 'bg-green-50/50 dark:bg-green-950/10' : ''
                        }`}>
                          <td className="py-3 pr-4 font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-inherit">
                            <div className="text-sm font-semibold">{firstDaySlot.label}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{firstDaySlot.timeSlot}</div>
                          </td>
                          {days.map(day => {
                            const slot = weeklyStructure[day]?.[slotIndex]
                            if (!slot) return <td key={day} className="py-3 px-3"></td>
                            
                            if (!slot.isEditable) {
                              return (
                                <td key={day} className="py-3 px-3 text-center">
                                  <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                    slot.type === 'prayer' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                                    slot.type === 'yoga' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                  }">
                                    {slot.type === 'prayer' ? '🤲' : slot.type === 'yoga' ? '🧘' : '☕'} {slot.label}
                                  </div>
                                </td>
                              )
                            }
                            
                            const currentSubject = timetableGrid[day]?.[slot.timeSlot] || ''
                            
                            return (
                              <td key={day} className="py-2 px-3">
                                <select
                                  value={currentSubject}
                                  onChange={(e) => handleSubjectChange(day, slot.timeSlot, e.target.value)}
                                  className={`w-full h-10 rounded-xl border px-3 text-xs outline-none focus:border-indigo-500 ${
                                    !currentSubject
                                      ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/20 text-slate-500'
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
                                {currentSubject && (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                                    {subjects.find(s => s.name === currentSubject)?.teacherName || 'No teacher assigned'}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          {/* Rules Card */}
          <Card className="mt-4">
            <CardHeader title="Subject Distribution Rules" subtitle="Follow these rules for valid timetable" />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Main Subjects</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Must appear 3+ times/week:</p>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Mathematics, Science, English, Hindi, Gujarati
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Special Rules</h4>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <li>• PT: Exactly 1 time/week</li>
                    <li>• Max 2 same subject/day</li>
                    <li>• Yoga: Saturday only (fixed)</li>
                  </ul>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </Page>
  )
}
