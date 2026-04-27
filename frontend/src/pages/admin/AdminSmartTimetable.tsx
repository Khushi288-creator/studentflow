import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'

type Subject = {
  name: string
  teacherId: string | null
  teacherName: string | null
}

const CLASSES = ['4', '5', '6', '7', '8']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Time slots for periods (excluding prayer and break)
const TIME_SLOTS = [
  '08:00 - 08:40', // Period 1
  '08:40 - 09:20', // Period 2
  '09:20 - 10:00', // Period 3
  // Break: 10:00 - 10:30
  '10:30 - 11:10', // Period 4
  '11:10 - 11:50', // Period 5
  '11:50 - 12:30', // Period 6
]

export default function AdminSmartTimetable() {
  const qc = useQueryClient()
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDay, setSelectedDay] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  // Fetch subjects for selected class
  const { data: subjectsData } = useQuery({
    queryKey: ['classSubjects', selectedClass],
    queryFn: async () => {
      if (!selectedClass) return null
      return (await http.get(`/subjects/class/${selectedClass}`)).data as { 
        class: number
        subjects: Subject[] 
      }
    },
    enabled: !!selectedClass,
  })

  // Fetch existing timetable
  const { data: timetableData, isLoading } = useQuery({
    queryKey: ['timetable'],
    queryFn: async () => {
      return (await http.get('/timetable/all')).data as { entries: any[] }
    },
  })

  // Auto-fetch teacher when subject is selected
  const handleSubjectChange = async (subjectName: string) => {
    setSelectedSubject(subjectName)
    
    if (!subjectName || !selectedClass) {
      setTeacherName('')
      return
    }

    try {
      const res = await http.get('/subjects/teacher-by-subject', {
        params: { class: selectedClass, subject: subjectName }
      })
      setTeacherName(res.data.teacherName || 'No teacher assigned')
    } catch (err) {
      setTeacherName('No teacher assigned')
    }
  }

  // Save timetable entry
  const saveMut = useMutation({
    mutationFn: async () => {
      if (!selectedClass || !selectedDay || !selectedTime || !selectedSubject) {
        throw new Error('Please fill all fields')
      }

      return (await http.post('/timetable', {
        type: 'regular',
        class: selectedClass,
        day: selectedDay,
        time: selectedTime,
        subject: selectedSubject,
      })).data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['timetable'] })
      showToast(data.message || 'Timetable entry added successfully!')
      // Reset form
      setSelectedDay('')
      setSelectedTime('')
      setSelectedSubject('')
      setTeacherName('')
    },
    onError: (e: any) => {
      const errorMsg = e?.response?.data?.message || e.message || 'Failed to save'
      showToast(errorMsg, false)
    },
  })

  // Delete timetable entry
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      return (await http.delete(`/timetable/${id}`)).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timetable'] })
      showToast('Entry deleted successfully!')
    },
    onError: () => {
      showToast('Failed to delete entry', false)
    },
  })

  const subjects = subjectsData?.subjects || []
  const entries = timetableData?.entries || []

  // Group entries by class
  const entriesByClass = entries.reduce((acc: any, entry: any) => {
    if (!acc[entry.class]) acc[entry.class] = []
    acc[entry.class].push(entry)
    return acc
  }, {})

  return (
    <Page
      title="Smart Timetable"
      subtitle="Manage school timetable with automatic teacher assignment and clash prevention"
    >
      {toast && (
        <div className={`fixed top-20 right-6 z-50 rounded-2xl border px-5 py-3 shadow-2xl text-sm font-semibold ${
          toast.ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
        }`}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Add Entry Form */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader title="Add Timetable Entry" subtitle="Fill all fields to add a period" />
            <CardBody>
              <div className="space-y-4">
                {/* Class Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Select Class *
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value)
                      setSelectedSubject('')
                      setTeacherName('')
                    }}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— Select Class —</option>
                    {CLASSES.map(c => (
                      <option key={c} value={c}>Class {c}</option>
                    ))}
                  </select>
                </div>

                {/* Day Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Select Day *
                  </label>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— Select Day —</option>
                    {DAYS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Time Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Select Time *
                  </label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— Select Time —</option>
                    <optgroup label="🤲 Prayer (Fixed)">
                      <option value="07:30 - 08:00" disabled>07:30 - 08:00 (Prayer)</option>
                    </optgroup>
                    <optgroup label="📚 Teaching Periods">
                      {TIME_SLOTS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </optgroup>
                    <optgroup label="☕ Break (Fixed)">
                      <option value="10:00 - 10:30" disabled>10:00 - 10:30 (Break)</option>
                    </optgroup>
                  </select>
                </div>

                {/* Subject Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Select Subject *
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    disabled={!selectedClass}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">— Select Subject —</option>
                    {subjects.map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Teacher Name (Auto-filled) */}
                {teacherName && (
                  <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/20 px-3 py-2.5">
                    <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                      Teacher (Auto-assigned)
                    </div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="text-indigo-500">👤</span> {teacherName}
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <button
                  type="button"
                  onClick={() => saveMut.mutate()}
                  disabled={saveMut.isPending || !selectedClass || !selectedDay || !selectedTime || !selectedSubject}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveMut.isPending ? 'Saving...' : '💾 Add to Timetable'}
                </button>
              </div>
            </CardBody>
          </Card>

          {/* Info Card */}
          <Card className="mt-4">
            <CardBody>
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <div className="font-semibold text-slate-900 dark:text-slate-100 mb-2">📋 Rules:</div>
                <div>• Prayer: 7:30-8:00 (Fixed, Mon-Sat)</div>
                <div>• Break: 10:00-10:30 (After 3 periods)</div>
                <div>• Teacher auto-assigned from subject</div>
                <div>• No teacher clash at same time</div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Timetable View */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader 
              title="Current Timetable" 
              subtitle={isLoading ? 'Loading...' : `${entries.length} entries`}
            />
            <CardBody className="overflow-x-auto">
              {isLoading ? (
                <div className="py-8 text-center text-sm text-slate-500">Loading timetable...</div>
              ) : entries.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">No timetable entries yet. Add your first entry!</div>
              ) : (
                <div className="space-y-6">
                  {CLASSES.map(classNum => {
                    const classEntries = entriesByClass[classNum] || []
                    if (classEntries.length === 0) return null

                    return (
                      <div key={classNum}>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                          Class {classNum}
                        </h3>
                        <table className="min-w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="border-b-2 border-slate-300 dark:border-slate-700">
                              <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Day</th>
                              <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Time</th>
                              <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Subject</th>
                              <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Teacher</th>
                              <th className="py-2 font-semibold text-slate-600 dark:text-slate-300">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classEntries.map((entry: any) => (
                              <tr key={entry.id} className="border-b border-slate-200 dark:border-slate-800">
                                <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">{entry.day}</td>
                                <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{entry.time}</td>
                                <td className="py-3 pr-4 font-semibold text-indigo-600 dark:text-indigo-400">{entry.subject}</td>
                                <td className="py-3 pr-4 text-xs text-slate-500 dark:text-slate-400">{entry.teacherName || '—'}</td>
                                <td className="py-3">
                                  <button
                                    type="button"
                                    onClick={() => deleteMut.mutate(entry.id)}
                                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </Page>
  )
}
