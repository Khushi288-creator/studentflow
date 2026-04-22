import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Page } from '../../components/ui/Page'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'

type Exam = { id: string; name: string; className: string; subjects: string[]; startDate: string; endDate: string; status: string }
type PendingMark = { id: string; examId: string; examName: string; studentUserId: string; studentName: string; courseId: string; courseName: string; marks: number; maxMarks: number; status: string }
type PublishedResult = { id: string; examId: string; examName: string; studentUserId: string; studentName: string; totalMarks: number; maxTotalMarks: number; percentage: number; grade: string; rank: number | null }
type Course = { id: string; name: string }

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`fixed top-20 right-6 z-50 rounded-2xl border px-5 py-3 shadow-2xl max-w-sm flex items-start gap-2 ${
      type === 'success' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
    }`}>
      <span className="text-lg">{type === 'success' ? '✓' : '✕'}</span>
      <span className="text-sm font-medium flex-1">{msg}</span>
      <button onClick={onClose} className="text-xs opacity-60 hover:opacity-100">✕</button>
    </div>
  )
}

function gradeColor(g: string) {
  if (g === 'A+' || g === 'A') return 'text-emerald-400'
  if (g.startsWith('B')) return 'text-indigo-400'
  if (g === 'C') return 'text-amber-400'
  return 'text-rose-400'
}

export default function ExamDepartmentDashboard() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'exams' | 'marks' | 'results'>('exams')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000)
  }

  // ── Create Exam form ──
  const [examForm, setExamForm] = useState({ name: '', className: '', startDate: '', endDate: '' })
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])

  const examsQ = useQuery({ queryKey: ['examList'], queryFn: async () => (await http.get('/exam/list')).data as { exams: Exam[] } })
  const marksQ = useQuery({ queryKey: ['pendingMarks'], queryFn: async () => (await http.get('/marks/pending')).data as { marks: PendingMark[] } })
  const resultsQ = useQuery({ queryKey: ['allResults'], queryFn: async () => (await http.get('/result/all')).data as { results: PublishedResult[] } })
  const coursesQ = useQuery({ queryKey: ['adminCourses'], queryFn: async () => (await http.get('/admin/courses')).data as { courses: Course[] } })

  const exams = examsQ.data?.exams ?? []
  const marks = marksQ.data?.marks ?? []
  const results = resultsQ.data?.results ?? []
  const courses = coursesQ.data?.courses ?? []

  const createExamMut = useMutation({
    mutationFn: async () => (await http.post('/exam/create', { ...examForm, subjects: selectedSubjects })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['examList'] })
      setExamForm({ name: '', className: '', startDate: '', endDate: '' })
      setSelectedSubjects([])
      showToast('Exam created successfully!')
    },
    onError: (e: any) => showToast(e?.response?.data?.message ?? 'Failed', 'error'),
  })

  const publishMut = useMutation({
    mutationFn: async (examId: string) => (await http.post('/result/publish', { examId })).data,
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['examList', 'pendingMarks', 'allResults'] })
      showToast(d.message ?? 'Results published!')
    },
    onError: (e: any) => showToast(e?.response?.data?.message ?? 'Failed to publish', 'error'),
  })

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await http.put(`/exam/${id}/status`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['examList'] }),
  })

  const toggleSubject = (id: string) =>
    setSelectedSubjects(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const CLASSES = ['All', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8']

  return (
    <Page title="📋 Exam Department" subtitle="Manage exams, verify marks, publish results">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'exams',   label: `📝 Exams (${exams.length})` },
          { key: 'marks',   label: `⏳ Pending Marks (${marks.filter(m => m.status === 'pending').length})` },
          { key: 'results', label: `📊 Published Results (${results.length})` },
        ] as const).map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              tab === t.key ? 'bg-indigo-600 text-white shadow-md' : 'border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── EXAMS TAB ── */}
      {tab === 'exams' && (
        <div className="space-y-5">
          {/* Create Exam */}
          <Card>
            <CardHeader title="Create New Exam" subtitle="Set up exam details and subjects" />
            <CardBody className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Exam Name *</span>
                  <input value={examForm.name} onChange={e => setExamForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Mid-Term 2025"
                    className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Class *</span>
                  <select value={examForm.className} onChange={e => setExamForm(p => ({ ...p, className: e.target.value }))}
                    className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500">
                    <option value="">Select class...</option>
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Start Date *</span>
                  <input type="date" value={examForm.startDate} onChange={e => setExamForm(p => ({ ...p, startDate: e.target.value }))}
                    className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">End Date *</span>
                  <input type="date" value={examForm.endDate} onChange={e => setExamForm(p => ({ ...p, endDate: e.target.value }))}
                    className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
                </label>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Subjects *</div>
                <div className="flex flex-wrap gap-2">
                  {courses.map(c => (
                    <button key={c.id} type="button" onClick={() => toggleSubject(c.id)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                        selectedSubjects.includes(c.id)
                          ? 'bg-indigo-600 text-white'
                          : 'border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-indigo-500/50'
                      }`}>
                      {c.name}
                    </button>
                  ))}
                  {courses.length === 0 && <span className="text-xs text-slate-500">No subjects found</span>}
                </div>
              </div>

              <button type="button"
                disabled={createExamMut.isPending || !examForm.name || !examForm.className || !examForm.startDate || !examForm.endDate || selectedSubjects.length === 0}
                onClick={() => createExamMut.mutate()}
                className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                {createExamMut.isPending ? 'Creating...' : '+ Create Exam'}
              </button>
            </CardBody>
          </Card>

          {/* Exam List */}
          <Card>
            <CardHeader title="All Exams" subtitle="Manage exam status and publish results" />
            <CardBody className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    {['Exam', 'Class', 'Dates', 'Status', 'Actions'].map(h => (
                      <th key={h} className="py-3 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exams.map(e => (
                    <tr key={e.id} className="border-b border-slate-100 dark:border-white/5">
                      <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{e.name}</td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{e.className}</td>
                      <td className="py-3 pr-4 text-xs text-slate-500">{e.startDate} → {e.endDate}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          e.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                          e.status === 'ongoing'   ? 'bg-amber-500/20 text-amber-300' :
                                                     'bg-slate-500/20 text-slate-400'
                        }`}>{e.status}</span>
                      </td>
                      <td className="py-3 flex gap-1.5 flex-wrap">
                        {e.status !== 'ongoing' && e.status !== 'completed' && (
                          <button type="button" onClick={() => statusMut.mutate({ id: e.id, status: 'ongoing' })}
                            className="rounded-lg border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-400 hover:bg-amber-500/10">
                            Start
                          </button>
                        )}
                        {e.status === 'ongoing' && (
                          <button type="button" disabled={publishMut.isPending}
                            onClick={() => { if (confirm(`Publish results for "${e.name}"?`)) publishMut.mutate(e.id) }}
                            className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                            {publishMut.isPending ? '...' : '📤 Publish'}
                          </button>
                        )}
                        {e.status === 'completed' && (
                          <span className="text-xs text-emerald-400 font-semibold">✓ Published</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!examsQ.isLoading && exams.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-sm text-slate-500">No exams yet.</td></tr>
                  )}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── MARKS TAB ── */}
      {tab === 'marks' && (
        <Card>
          <CardHeader title="Pending Marks" subtitle="Marks entered by teachers — verify before publishing" />
          <CardBody className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {['Exam', 'Student', 'Subject', 'Marks', 'Status'].map(h => (
                    <th key={h} className="py-3 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {marks.map(m => (
                  <tr key={m.id} className="border-b border-slate-100 dark:border-white/5">
                    <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-200">{m.examName}</td>
                    <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-white">{m.studentName}</td>
                    <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{m.courseName}</td>
                    <td className="py-2.5 pr-4 font-bold text-slate-900 dark:text-white">{m.marks}/{m.maxMarks}</td>
                    <td className="py-2.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        m.status === 'verified' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>{m.status}</span>
                    </td>
                  </tr>
                ))}
                {!marksQ.isLoading && marks.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-sm text-slate-500">No pending marks.</td></tr>
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* ── RESULTS TAB ── */}
      {tab === 'results' && (
        <Card>
          <CardHeader title="Published Results" subtitle="All published exam results" />
          <CardBody className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {['Exam', 'Student', 'Total', 'Percentage', 'Grade', 'Rank'].map(h => (
                    <th key={h} className="py-3 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.id} className="border-b border-slate-100 dark:border-white/5">
                    <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-200">{r.examName}</td>
                    <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-white">{r.studentName}</td>
                    <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{r.totalMarks}/{r.maxTotalMarks}</td>
                    <td className="py-2.5 pr-4 font-bold text-slate-900 dark:text-white">{r.percentage}%</td>
                    <td className={`py-2.5 pr-4 font-bold ${gradeColor(r.grade)}`}>{r.grade}</td>
                    <td className="py-2.5 text-slate-500">{r.rank ? `#${r.rank}` : '—'}</td>
                  </tr>
                ))}
                {!resultsQ.isLoading && results.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-sm text-slate-500">No published results yet.</td></tr>
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </Page>
  )
}
