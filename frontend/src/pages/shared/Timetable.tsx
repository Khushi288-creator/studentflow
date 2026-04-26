import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import { useAuthStore } from '../../store/authStore'

type TimetableEntry = {
  id: string; type: string; class: string; day: string
  subject: string; time: string; teacherName?: string; date?: string
  slotType?: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const CLASSES = ['4', '5', '6', '7', '8']

function TimetableTable({ entries, type }: { entries: TimetableEntry[]; type: 'regular' | 'exam' }) {
  if (entries.length === 0) {
    return <div className="py-8 text-center text-sm text-slate-500">No timetable entries yet.</div>
  }

  if (type === 'regular') {
    // Group entries by time slot (period)
    const timeSlots = Array.from(new Set(entries.map(e => e.time))).sort()
    
    // Create a map: time -> day -> entry
    const gridMap: Record<string, Record<string, TimetableEntry>> = {}
    entries.forEach(entry => {
      if (!gridMap[entry.time]) {
        gridMap[entry.time] = {}
      }
      gridMap[entry.time][entry.day] = entry
    })

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-300 dark:border-slate-700">
              <th className="py-3 pr-4 font-semibold text-slate-600 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-950 z-10 min-w-[100px]">
                Period / Time
              </th>
              {DAYS.map(day => (
                <th key={day} className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-300 text-center min-w-[140px]">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((timeSlot, index) => {
              // Check if this is a break/prayer/yoga row
              const firstEntry = Object.values(gridMap[timeSlot])[0]
              const slotType = firstEntry?.slotType || 'period'
              const isBreak = slotType === 'break'
              const isPrayer = slotType === 'prayer'
              const isYoga = slotType === 'yoga'
              const isPT = slotType === 'pt'
              
              return (
                <tr key={timeSlot} className={`border-b border-slate-200 dark:border-slate-800 ${
                  isBreak ? 'bg-amber-50/50 dark:bg-amber-950/10' :
                  isPrayer ? 'bg-purple-50/50 dark:bg-purple-950/10' :
                  isYoga ? 'bg-green-50/50 dark:bg-green-950/10' : ''
                }`}>
                  <td className="py-3 pr-4 font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-inherit">
                    <div className="text-sm font-semibold">
                      {isPrayer ? '🤲 Prayer' : 
                       isYoga ? '🧘 Yoga' : 
                       isBreak ? '☕ Break' : 
                       isPT ? '🏃 PT' :
                       `Period ${index + 1}`}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{timeSlot}</div>
                  </td>
                  {DAYS.map(day => {
                    const entry = gridMap[timeSlot]?.[day]
                    
                    if (!entry) {
                      return (
                        <td key={day} className="py-3 px-3 text-center">
                          <span className="text-xs text-slate-400">—</span>
                        </td>
                      )
                    }
                    
                    // For non-editable slots (prayer, break, yoga)
                    if (isBreak || isPrayer || isYoga) {
                      return (
                        <td key={day} className="py-3 px-3 text-center">
                          <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                            isPrayer ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                            isYoga ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                            'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                          }`}>
                            {entry.subject}
                          </div>
                        </td>
                      )
                    }
                    
                    // Regular period with subject and teacher
                    return (
                      <td key={day} className="py-3 px-3">
                        <div className="text-center">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                            {entry.subject}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {entry.teacherName || 'No teacher'}
                          </div>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // Exam timetable
  return (
    <table className="min-w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 dark:border-slate-800">
          <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Subject</th>
          <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Day</th>
          <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Date</th>
          <th className="py-2 font-semibold text-slate-600 dark:text-slate-300">Time</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(e => (
          <tr key={e.id} className="border-b border-slate-100 dark:border-slate-900/60">
            <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-50">{e.subject}</td>
            <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{e.day}</td>
            <td className="py-3 pr-4 text-slate-500 text-xs">{e.date || '—'}</td>
            <td className="py-3 text-slate-600 dark:text-slate-300">{e.time}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function Timetable() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<'regular' | 'exam'>('regular')
  const isTeacher = user?.role === 'teacher'
  const [selectedClass, setSelectedClass] = useState('4')

  const { data, isLoading } = useQuery({
    queryKey: ['timetable', tab, isTeacher ? selectedClass : undefined],
    queryFn: async () => {
      const params: any = { type: tab }
      if (isTeacher) params.class = selectedClass
      return (await http.get('/timetable', { params })).data as { entries: TimetableEntry[] }
    },
  })
  const entries = data?.entries ?? []

  return (
    <Page title="Timetable" subtitle={isTeacher ? 'All class timetables' : 'Your class timetable'}>
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['regular', 'exam'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === t ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
            }`}>
            {t === 'regular' ? '📅 Regular' : '📝 Exam'}
          </button>
        ))}
      </div>

      {/* Teacher: class selector */}
      {isTeacher && (
        <div className="flex gap-2 flex-wrap">
          {CLASSES.map(c => (
            <button key={c} type="button" onClick={() => setSelectedClass(c)}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                selectedClass === c
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
              }`}>
              Class {c}
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader
          title={isTeacher ? `Class ${selectedClass} — ${tab === 'regular' ? 'Regular' : 'Exam'} Timetable` : `${tab === 'regular' ? 'Regular' : 'Exam'} Timetable`}
          subtitle={isLoading ? 'Loading...' : `${entries.length} entries`}
        />
        <CardBody className="overflow-x-auto">
          {isLoading ? (
            <div className="py-6 text-sm text-slate-500">Loading timetable...</div>
          ) : (
            <TimetableTable entries={entries} type={tab} />
          )}
        </CardBody>
      </Card>
    </Page>
  )
}
