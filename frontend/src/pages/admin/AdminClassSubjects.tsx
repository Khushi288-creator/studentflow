import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Page } from '../../components/ui/Page'

type Subject = { name: string; teacherId: string | null; teacherName: string | null }
type ClassData = { class: number; subjects: Subject[] }
type Teacher = { id: string; name: string }

const CLASSES = [4, 5, 6, 7, 8]

export default function AdminClassSubjects() {
  const qc = useQueryClient()
  const [selectedClass, setSelectedClass] = useState(4)
  const [newSubject, setNewSubject] = useState('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [assigningSubject, setAssigningSubject] = useState<string | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3500)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['classSubjects', selectedClass],
    queryFn: async () => (await http.get(`/subjects/class/${selectedClass}`)).data as ClassData,
  })

  const allQ = useQuery({
    queryKey: ['allClassSubjects'],
    queryFn: async () => (await http.get('/subjects/all')).data as { classes: ClassData[] },
  })

  const teachersQ = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => (await http.get('/admin/teachers')).data as { teachers: Teacher[] },
  })

  const addMut = useMutation({
    mutationFn: async () => (await http.post('/subjects/add', { class: selectedClass, name: newSubject.trim() })).data,
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['classSubjects', selectedClass] })
      qc.invalidateQueries({ queryKey: ['allClassSubjects'] })
      setNewSubject('')
      showToast(d.message ?? 'Subject added!')
    },
    onError: (e: any) => showToast(e?.response?.data?.message ?? 'Failed', false),
  })

  const removeMut = useMutation({
    mutationFn: async (name: string) => (await http.delete('/subjects/remove', { data: { class: selectedClass, name } })).data,
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['classSubjects', selectedClass] })
      qc.invalidateQueries({ queryKey: ['allClassSubjects'] })
      showToast(d.message ?? 'Removed')
    },
    onError: (e: any) => showToast(e?.response?.data?.message ?? 'Failed', false),
  })

  const assignTeacherMut = useMutation({
    mutationFn: async ({ subject, teacherId }: { subject: string; teacherId: string | null }) => 
      (await http.put('/subjects/assign-teacher', { class: selectedClass, subject, teacherId })).data,
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['classSubjects', selectedClass] })
      qc.invalidateQueries({ queryKey: ['allClassSubjects'] })
      setAssigningSubject(null)
      showToast(d.message ?? 'Teacher assigned!')
    },
    onError: (e: any) => showToast(e?.response?.data?.message ?? 'Failed', false),
  })

  const subjects = data?.subjects ?? []
  const teachers = teachersQ.data?.teachers ?? []

  return (
    <Page title="Class Subjects" subtitle="Manage subjects for each class (4–8)">

      {toast && (
        <div className={`fixed top-20 right-6 z-50 rounded-2xl border px-5 py-3 shadow-2xl text-sm font-semibold ${
          toast.ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
        }`}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-12">

        {/* Class selector */}
        <div className="lg:col-span-3 space-y-2">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Select Class</div>
          {CLASSES.map(c => (
            <button key={c} type="button" onClick={() => setSelectedClass(c)}
              className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all ${
                selectedClass === c
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}>
              <div>Class {c}</div>
              <div className={`text-xs mt-0.5 ${selectedClass === c ? 'text-indigo-200' : 'text-slate-400'}`}>
                {allQ.data?.classes.find(d => d.class === c)?.subjects.length ?? '—'} subjects
              </div>
            </button>
          ))}
        </div>

        {/* Subject list + add */}
        <div className="lg:col-span-9 space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Class {selectedClass} Subjects</div>
                <div className="text-xs text-slate-500 mt-0.5">{subjects.length} subjects</div>
              </div>
            </div>

            {/* Add subject */}
            <div className="flex gap-2 mb-5">
              <input
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newSubject.trim()) addMut.mutate() }}
                placeholder="New subject name..."
                className="h-10 flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 placeholder:text-slate-400"
              />
              <button type="button"
                disabled={!newSubject.trim() || addMut.isPending}
                onClick={() => addMut.mutate()}
                className="rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                {addMut.isPending ? '...' : '+ Add'}
              </button>
            </div>

            {/* Subject grid */}
            {isLoading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                {subjects.map((s, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-white/3 p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📚</span>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.name}</span>
                      </div>
                      <button type="button"
                        onClick={() => { if (confirm(`Remove "${s.name}" from Class ${selectedClass}?`)) removeMut.mutate(s.name) }}
                        className="text-xs text-slate-400 hover:text-rose-500 transition-colors">
                        ✕
                      </button>
                    </div>
                    
                    {/* Teacher Assignment */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Teacher:</span>
                      {assigningSubject === s.name ? (
                        <div className="flex gap-1 flex-1">
                          <select
                            className="h-7 flex-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 text-xs text-slate-900 dark:text-white outline-none"
                            onChange={(e) => {
                              const teacherId = e.target.value || null
                              assignTeacherMut.mutate({ subject: s.name, teacherId })
                            }}
                            defaultValue={s.teacherId ?? ''}
                          >
                            <option value="">No teacher</option>
                            {teachers.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => setAssigningSubject(null)}
                            className="text-xs text-slate-400 hover:text-slate-600 px-1"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigningSubject(s.name)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          {s.teacherName ? s.teacherName : 'Assign'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All classes overview */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
            <div className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">All Classes Overview</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="py-2 pr-6 text-xs font-semibold text-slate-500 dark:text-slate-400">Class</th>
                    <th className="py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Subjects</th>
                  </tr>
                </thead>
                <tbody>
                  {(allQ.data?.classes ?? []).map(d => (
                    <tr key={d.class} className="border-b border-slate-100 dark:border-white/5">
                      <td className="py-2.5 pr-6 font-semibold text-slate-900 dark:text-white">Class {d.class}</td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {d.subjects.map((s, i) => (
                            <span key={i} className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs text-indigo-400" title={s.teacherName ? `Teacher: ${s.teacherName}` : 'No teacher assigned'}>
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Page>
  )
}
