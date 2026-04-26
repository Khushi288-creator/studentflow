import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { useAuthStore } from '../../store/authStore'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'

type ResultRow = { id: string; courseId: string; courseName?: string; marks: number; grade: string; studentName?: string }
type ExamResult = {
  id: string; examId: string; examName: string; className: string
  subjects: { courseId: string; courseName: string; marks: number; maxMarks: number; grade: string }[]
  totalMarks: number; maxTotalMarks: number; percentage: number; grade: string; rank: number | null
}
type StudentUser = { id: string; name: string }
type Course = { id: string; name: string }
type Exam = { id: string; name: string; className: string; status: string }

function gradeColor(grade: string) {
  if (grade === 'A') return 'text-emerald-600 dark:text-emerald-400'
  if (grade === 'B') return 'text-indigo-600 dark:text-indigo-400'
  if (grade === 'C') return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'  // D
}

// ── Admin View — analytics + view only ───────────────────────────────────
function AdminResults() {
  const [filterExam, setFilterExam] = useState('')
  const resultsQ    = useQuery({ queryKey: ['adminResults'], queryFn: async () => (await http.get('/admin/results')).data as { results: ResultRow[] } })
  const examResultsQ = useQuery({ queryKey: ['allExamResults', filterExam], queryFn: async () => (await http.get(`/result/all${filterExam ? `?examId=${filterExam}` : ''}`)).data as { results: any[] } })
  const examsQ      = useQuery({ queryKey: ['examList'], queryFn: async () => (await http.get('/exam/list')).data as { exams: Exam[] } })
  const analyticsQ  = useQuery({ queryKey: ['resultAnalytics'], queryFn: async () => (await http.get('/result/analytics')).data as any })

  const legacyResults = resultsQ.data?.results ?? []
  const examResults   = examResultsQ.data?.results ?? []
  const exams         = examsQ.data?.exams ?? []
  const analytics     = analyticsQ.data

  return (
    <Page title="Results" subtitle="View and analyze results. Use Exam Department to publish.">
      {analytics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Exams',    value: analytics.totalExams,     color: 'text-indigo-400' },
            { label: 'Published',      value: analytics.totalPublished, color: 'text-emerald-400' },
            { label: 'Avg Percentage', value: `${analytics.avgPct}%`,   color: 'text-amber-400' },
            { label: 'Grade A',        value: analytics.gradeDist?.['A'] ?? 0, color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader title="Published Exam Results" subtitle="Results published by Exam Department"
          right={
            <select value={filterExam} onChange={e => setFilterExam(e.target.value)}
              className="h-8 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 text-xs text-slate-900 dark:text-white outline-none">
              <option value="">All Exams</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          } />
        <CardBody className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                {['Student', 'Exam', 'Total', '%', 'Grade', 'Rank'].map(h => (
                  <th key={h} className="py-3 pr-4 text-xs font-semibold text-slate-600 dark:text-slate-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {examResults.map((r: any) => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-900/60">
                  <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-slate-50">{r.studentName}</td>
                  <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{r.examName}</td>
                  <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-200">{r.totalMarks}/{r.maxTotalMarks}</td>
                  <td className="py-2.5 pr-4 font-bold text-slate-900 dark:text-white">{r.percentage}%</td>
                  <td className={`py-2.5 pr-4 font-bold ${gradeColor(r.grade)}`}>{r.grade}</td>
                  <td className="py-2.5 text-slate-500">{r.rank ? `#${r.rank}` : '—'}</td>
                </tr>
              ))}
              {!examResultsQ.isLoading && examResults.length === 0 && (
                <tr><td colSpan={6} className="py-5 text-center text-sm text-slate-500">No published results yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {legacyResults.length > 0 && (
        <Card>
          <CardHeader title="Legacy Results" subtitle="Results entered directly (old system)" />
          <CardBody className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  {['Student', 'Subject', 'Marks', 'Grade'].map(h => (
                    <th key={h} className="py-3 pr-6 text-xs font-semibold text-slate-600 dark:text-slate-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {legacyResults.map(r => (
                  <tr key={r.id} className="border-b border-slate-100 dark:border-slate-900/60">
                    <td className="py-3 pr-6 font-medium text-slate-900 dark:text-slate-50">{r.studentName ?? '—'}</td>
                    <td className="py-3 pr-6 text-slate-600 dark:text-slate-300">{r.courseName ?? r.courseId}</td>
                    <td className="py-3 pr-6 text-slate-700 dark:text-slate-200">{r.marks}</td>
                    <td className={`py-3 font-bold ${gradeColor(r.grade)}`}>{r.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </Page>
  )
}

// ── Teacher View — enter marks ────────────────────────────────────────────
function TeacherResults() {
  const qc = useQueryClient()
  const [examId, setExamId]       = useState('')
  const [courseId, setCourseId]   = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [studentId, setStudentId] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [showDropdown, setShowDropdown]   = useState(false)
  const [marks, setMarks]         = useState('')
  const [maxMarks, setMaxMarks]   = useState('100')
  const [success, setSuccess]     = useState('')
  const [error, setError]         = useState('')

  const CLASSES = ['Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8']

  const examsQ   = useQuery({ queryKey: ['examList'],      queryFn: async () => (await http.get('/exam/list')).data as { exams: Exam[] } })
  const coursesQ = useQuery({ queryKey: ['teacherCourses'], queryFn: async () => (await http.get('/courses?scope=teacher')).data as { courses: Course[] } })
  const myMarksQ = useQuery({ queryKey: ['pendingMarks'],  queryFn: async () => (await http.get('/marks/pending')).data as { marks: any[] } })

  // Fetch students only when a class is selected
  const studentsQ = useQuery({
    queryKey: ['studentsByClass', selectedClass],
    queryFn: async () => {
      const res = await http.get(`/exam/students-by-class/${encodeURIComponent(selectedClass)}`)
      return res.data as { students: StudentUser[] }
    },
    enabled: Boolean(selectedClass),
  })

  const exams    = examsQ.data?.exams ?? []
  const courses  = coursesQ.data?.courses ?? []
  const allStudents = studentsQ.data?.students ?? []
  const myMarks  = myMarksQ.data?.marks ?? []

  // Filter students by search text
  const filteredStudents = studentSearch.trim()
    ? allStudents.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
    : allStudents

  const selectedStudent = allStudents.find(s => s.id === studentId)

  const addMarksMut = useMutation({
    mutationFn: async () => (await http.post('/marks/add', {
      examId, courseId, studentUserId: studentId,
      marks: Number(marks), maxMarks: Number(maxMarks),
    })).data,
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['pendingMarks'] })
      setSuccess(d.message ?? 'Marks saved!')
      setError(''); setMarks(''); setStudentId(''); setStudentSearch('')
      setTimeout(() => setSuccess(''), 3000)
    },
    onError: (e: any) => { setError(e?.response?.data?.message ?? 'Failed'); setSuccess('') },
  })

  return (
    <Page title="Results" subtitle="Enter marks for your subjects — pending verification by Exam Department">
      <Card>
        <CardHeader title="Enter Marks" subtitle="Saved as pending until Exam Dept publishes" />
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            {/* Exam */}
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Exam *</span>
              <select value={examId} onChange={e => setExamId(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500">
                <option value="">Select exam...</option>
                {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </label>

            {/* Subject */}
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Subject *</span>
              <select value={courseId} onChange={e => setCourseId(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500">
                <option value="">Select subject...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            {/* Class */}
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Class *</span>
              <select value={selectedClass}
                onChange={e => { setSelectedClass(e.target.value); setStudentId(''); setStudentSearch('') }}
                className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500">
                <option value="">Select class...</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            {/* Student — searchable dropdown */}
            <div className="grid gap-1 relative">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Student *</span>
              <div className="relative">
                <input
                  value={studentSearch}
                  onChange={e => { setStudentSearch(e.target.value); setStudentId(''); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder={!selectedClass ? 'Select class first...' : studentsQ.isLoading ? 'Loading...' : 'Search student...'}
                  disabled={!selectedClass}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 disabled:opacity-50"
                />
                {/* Selected student badge */}
                {selectedStudent && !showDropdown && (
                  <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                    <span className="text-sm text-slate-900 dark:text-white truncate">{selectedStudent.name}</span>
                  </div>
                )}
                {/* Dropdown list */}
                {showDropdown && selectedClass && filteredStudents.length > 0 && (
                  <div className="absolute z-20 top-11 left-0 right-0 max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xl">
                    {filteredStudents.map(s => (
                      <button key={s.id} type="button"
                        onMouseDown={() => { setStudentId(s.id); setStudentSearch(s.name); setShowDropdown(false) }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors ${
                          studentId === s.id ? 'bg-indigo-50 dark:bg-indigo-900/30 font-semibold text-indigo-600 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && selectedClass && !studentsQ.isLoading && filteredStudents.length === 0 && (
                  <div className="absolute z-20 top-11 left-0 right-0 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xl px-3 py-2 text-sm text-slate-400">
                    No students found
                  </div>
                )}
              </div>
            </div>

            {/* Marks */}
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Marks *</span>
              <input type="number" min={0} max={Number(maxMarks)} value={marks}
                onChange={e => setMarks(e.target.value)} placeholder="e.g. 85"
                className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
            </label>

            {/* Max Marks */}
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Max Marks</span>
              <input type="number" min={1} value={maxMarks} onChange={e => setMaxMarks(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
            </label>

            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <button type="button"
                disabled={!examId || !courseId || !studentId || !marks || addMarksMut.isPending}
                onClick={() => addMarksMut.mutate()}
                className="h-10 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {addMarksMut.isPending ? 'Saving...' : 'Save Marks'}
              </button>
            </div>
          </div>

          {success && <p className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-300">✓ {success}</p>}
          {error   && <p className="rounded-xl bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">✕ {error}</p>}
        </CardBody>
      </Card>

      {myMarks.length > 0 && (
        <Card>
          <CardHeader title="My Entered Marks" subtitle="Pending verification" />
          <CardBody className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  {['Exam', 'Student', 'Subject', 'Marks', 'Status'].map(h => (
                    <th key={h} className="py-2 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myMarks.map((m: any) => (
                  <tr key={m.id} className="border-b border-slate-100 dark:border-slate-900/60">
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">{m.examName}</td>
                    <td className="py-2 pr-4 font-medium text-slate-900 dark:text-slate-50">{m.studentName}</td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">{m.courseName}</td>
                    <td className="py-2 pr-4 font-bold">{m.marks}/{m.maxMarks}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.status === 'verified' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>{m.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </Page>
  )
}

// ── Student/Parent View ───────────────────────────────────────────────────
function StudentResults() {
  const { data, isLoading } = useQuery({
    queryKey: ['myResults'],
    queryFn: async () => (await http.get('/result/my')).data as { results: ExamResult[] },
  })
  const results = data?.results ?? []
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <Page title="My Results" subtitle="Published exam results">
      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
      {!isLoading && results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-12 text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-sm text-slate-500">No results published yet.</div>
          <div className="text-xs text-slate-400 mt-1">Results appear here once the Exam Department publishes them.</div>
        </div>
      )}
      <div className="space-y-4">
        {results.map(r => (
          <Card key={r.id}>
            <CardBody>
              <div className="flex items-center justify-between gap-4 flex-wrap cursor-pointer" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{r.examName}</div>
                  <div className="text-xs text-slate-500">{r.className}</div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{r.percentage}%</div>
                    <div className="text-xs text-slate-500">Percentage</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-black ${gradeColor(r.grade)}`}>{r.grade}</div>
                    <div className="text-xs text-slate-500">Grade</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{r.totalMarks}/{r.maxTotalMarks}</div>
                    <div className="text-xs text-slate-500">Total</div>
                  </div>
                  {r.rank && (
                    <div className="text-center">
                      <div className="text-2xl font-black text-amber-400">#{r.rank}</div>
                      <div className="text-xs text-slate-500">Rank</div>
                    </div>
                  )}
                  <span className="text-slate-400 text-sm">{expanded === r.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === r.id && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        {['Subject', 'Marks', 'Max', 'Grade'].map(h => (
                          <th key={h} className="py-2 pr-6 text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.subjects.map((s, i) => (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-900/60">
                          <td className="py-2 pr-6 font-medium text-slate-900 dark:text-slate-50">{s.courseName}</td>
                          <td className="py-2 pr-6 text-slate-700 dark:text-slate-200">{s.marks}</td>
                          <td className="py-2 pr-6 text-slate-500">{s.maxMarks}</td>
                          <td className={`py-2 font-bold ${gradeColor(s.grade)}`}>{s.grade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  )
}

// ── Entry Point ────────────────────────────────────────────────────────────
export default function Result() {
  const { user } = useAuthStore()
  if (user?.role === 'admin') return <AdminResults />
  if (user?.role === 'teacher') return <TeacherResults />
  return <StudentResults />
}
