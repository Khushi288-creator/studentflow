import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Page } from '../../components/ui/Page'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'

type Exam = { id: string; name: string; className: string; subject?: string; subjects: string[]; startDate: string; endDate: string; time?: string; status: string }
type PendingMark = { id: string; examId: string; examName: string; studentUserId: string; studentName: string; courseId: string; courseName: string; marks: number; maxMarks: number; status: string }
type PublishedResult = { id: string; examId: string; examName: string; studentUserId: string; studentName: string; totalMarks: number; maxTotalMarks: number; percentage: number; grade: string; rank: number | null }
type ClassSubject = string

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
  if (g === 'A') return 'text-emerald-400'
  if (g === 'B') return 'text-indigo-400'
  if (g === 'C') return 'text-amber-400'
  return 'text-rose-400'  // D
}

export default function ExamDepartmentDashboard() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'exams' | 'marks' | 'results'>('exams')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000)
  }

  // ── Create Exam form ──
  const [examForm, setExamForm] = useState({ name: '', className: '', subject: '', startDate: '', endDate: '', time: '' })
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([])

  // Fetch subjects when class is selected
  const classNum = examForm.className.replace('Class ', '').trim()
  const classNumInt = parseInt(classNum)
  const shouldFetchSubjects = Boolean(classNum && !isNaN(classNumInt) && classNumInt >= 4 && classNumInt <= 8)

  const classSubjectsQ = useQuery({
    queryKey: ['classSubjects', classNum],
    queryFn: async () => {
      if (!shouldFetchSubjects) return { subjects: [] }
      const res = await http.get(`/exam/subjects-by-class/${classNum}`)
      return res.data as { subjects: ClassSubject[] }
    },
    enabled: shouldFetchSubjects,
  })

  // Update classSubjects when query data changes
  React.useEffect(() => {
    if (classSubjectsQ.data?.subjects) {
      setClassSubjects(classSubjectsQ.data.subjects)
      // Reset subject selection when class changes
      setExamForm(p => ({ ...p, subject: '' }))
    } else {
      setClassSubjects([])
    }
  }, [classSubjectsQ.data])

  const examsQ = useQuery({ 
    queryKey: ['examList'], 
    queryFn: async () => {
      console.log('Fetching exam list...')
      const response = await http.get('/exam/list')
      console.log('Exam list response:', response.data)
      return response.data as { exams: Exam[] }
    },
    retry: 1,
  })
  const marksQ = useQuery({ 
    queryKey: ['pendingMarks'], 
    queryFn: async () => {
      console.log('Fetching pending marks...')
      const response = await http.get('/marks/pending')
      console.log('Pending marks response:', response.data)
      return response.data as { marks: PendingMark[] }
    },
    retry: 1,
  })
  const resultsQ = useQuery({ 
    queryKey: ['allResults'], 
    queryFn: async () => {
      console.log('Fetching all results...')
      const response = await http.get('/result/all')
      console.log('All results response:', response.data)
      return response.data as { results: PublishedResult[] }
    },
    retry: 1,
  })

  const exams = examsQ.data?.exams ?? []
  const marks = marksQ.data?.marks ?? []
  const results = resultsQ.data?.results ?? []

  const createExamMut = useMutation({
    mutationFn: async () => (await http.post('/exam/create', {
      name: examForm.name,
      className: examForm.className,
      subject: examForm.subject,
      startDate: examForm.startDate,
      endDate: examForm.endDate,
      time: examForm.time || undefined,
    })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['examList'] })
      setExamForm({ name: '', className: '', subject: '', startDate: '', endDate: '', time: '' })
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

  const CLASSES = ['Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8']

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
                    {CLASSES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Subject *</span>
                  <select value={examForm.subject} onChange={e => setExamForm(p => ({ ...p, subject: e.target.value }))}
                    disabled={!examForm.className || classSubjectsQ.isLoading}
                    className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 disabled:opacity-50">
                    <option value="">
                      {!examForm.className ? 'Select class first...' : classSubjectsQ.isLoading ? 'Loading subjects...' : 'Select subject...'}
                    </option>
                    {classSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Time (Optional)</span>
                  <input value={examForm.time} onChange={e => setExamForm(p => ({ ...p, time: e.target.value }))}
                    placeholder="e.g. 10:00 AM - 12:00 PM"
                    className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
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

              <button type="button"
                disabled={createExamMut.isPending || !examForm.name || !examForm.className || !examForm.subject || !examForm.startDate || !examForm.endDate}
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
              {examsQ.isLoading ? (
                <div className="py-6 text-center text-sm text-slate-400">Loading exams...</div>
              ) : examsQ.error ? (
                <div className="py-6 text-center text-sm text-rose-400">Error loading exams</div>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10">
                      {['Exam', 'Class', 'Subject', 'Dates', 'Time', 'Status', 'Actions'].map(h => (
                        <th key={h} className="py-3 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map(e => (
                      <tr key={e.id} className="border-b border-slate-100 dark:border-white/5">
                        <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{e.name}</td>
                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{e.className}</td>
                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{e.subject ?? '—'}</td>
                        <td className="py-3 pr-4 text-xs text-slate-500">{e.startDate} → {e.endDate}</td>
                        <td className="py-3 pr-4 text-xs text-slate-500">{e.time ?? '—'}</td>
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
                    {exams.length === 0 && (
                      <tr><td colSpan={7} className="py-6 text-center text-sm text-slate-500">No exams yet.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── MARKS TAB ── */}
      {tab === 'marks' && (
        <Card>
          <CardHeader title="Pending Marks" subtitle="Marks entered by teachers — verify before publishing" />
          <CardBody className="overflow-x-auto">
            {marksQ.isLoading ? (
              <div className="py-6 text-center text-sm text-slate-400">Loading marks...</div>
            ) : marksQ.error ? (
              <div className="py-6 text-center text-sm text-rose-400">Error loading marks</div>
            ) : (
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
                  {marks.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-sm text-slate-500">No pending marks.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {/* ── RESULTS TAB ── */}
      {tab === 'results' && (
        <Card>
          <CardHeader title="Published Results" subtitle="All published exam results" />
          <CardBody className="overflow-x-auto">
            {resultsQ.isLoading ? (
              <div className="py-6 text-center text-sm text-slate-400">Loading results...</div>
            ) : resultsQ.error ? (
              <div className="py-6 text-center text-sm text-rose-400">Error loading results</div>
            ) : (
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
                  {results.length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center text-sm text-slate-500">No published results yet.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}
    </Page>
  )
}
