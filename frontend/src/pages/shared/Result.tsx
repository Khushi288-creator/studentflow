import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { useAuthStore } from '../../store/authStore'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'

type ResultRow = {
  id: string
  courseId: string
  courseName?: string
  assignmentTitle?: string
  marks: number
  grade: string
  studentName?: string
}
type StudentUser = { id: string; name: string }
type Course = { id: string; name: string }

function gradeColor(grade: string) {
  if (grade === 'A+' || grade === 'A') return 'text-emerald-600 dark:text-emerald-400'
  if (grade === 'B') return 'text-indigo-600 dark:text-indigo-400'
  if (grade === 'C') return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

// ── Admin View ─────────────────────────────────────────────────────────────
function AdminResults() {
  const queryClient = useQueryClient()
  const [studentId, setStudentId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [marks, setMarks] = useState('')

  const resultsQuery = useQuery({
    queryKey: ['adminResults'],
    queryFn: async () => (await http.get('/admin/results')).data as { results: ResultRow[] },
  })

  const studentsQuery = useQuery({
    queryKey: ['adminStudents'],
    queryFn: async () => (await http.get('/admin/students')).data as { students: StudentUser[] },
  })

  const coursesQuery = useQuery({
    queryKey: ['adminCourses'],
    queryFn: async () => (await http.get('/admin/courses')).data as { courses: Course[] },
  })

  const createMutation = useMutation({
    mutationFn: async () =>
      (await http.post('/admin/results', { studentUserId: studentId, courseId, marks: Number(marks) })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminResults'] })
      setStudentId(''); setCourseId(''); setMarks('')
    },
  })

  const results = resultsQuery.data?.results ?? []
  const students = studentsQuery.data?.students ?? []
  const courses = coursesQuery.data?.courses ?? []

  return (
    <Page title="Results" subtitle="Add and manage student results.">
      {/* Add Result */}
      <Card>
        <CardHeader title="Add Result" subtitle="Enter marks for a student" />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Student</span>
              <select value={studentId} onChange={e => setStudentId(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                <option value="">Select student...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Subject</span>
              <select value={courseId} onChange={e => setCourseId(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                <option value="">Select subject...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Marks (0–100)</span>
              <input type="number" min={0} max={100} value={marks} onChange={e => setMarks(e.target.value)}
                placeholder="e.g. 85"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
            </label>
            <div className="flex items-end">
              <button type="button"
                disabled={!studentId || !courseId || !marks || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="h-10 w-full rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {createMutation.isPending ? 'Saving...' : 'Add Result'}
              </button>
            </div>
          </div>
          {createMutation.isSuccess && <p className="mt-2 text-xs text-emerald-600">Result saved successfully.</p>}
          {createMutation.isError && <p className="mt-2 text-xs text-rose-600">Failed. Try again.</p>}
        </CardBody>
      </Card>

      {/* All Results */}
      <Card>
        <CardHeader title="All Results" subtitle="Student-wise marks" />
        <CardBody className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 pr-6 font-semibold text-slate-600 dark:text-slate-300">Student</th>
                <th className="py-3 pr-6 font-semibold text-slate-600 dark:text-slate-300">Subject</th>
                <th className="py-3 pr-6 font-semibold text-slate-600 dark:text-slate-300">Marks</th>
                <th className="py-3 font-semibold text-slate-600 dark:text-slate-300">Grade</th>
              </tr>
            </thead>
            <tbody>
              {resultsQuery.isLoading && <tr><td colSpan={4} className="py-4 text-sm text-slate-500">Loading...</td></tr>}
              {results.map(r => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-900/60">
                  <td className="py-3 pr-6 font-medium text-slate-900 dark:text-slate-50">{r.studentName ?? '—'}</td>
                  <td className="py-3 pr-6 text-slate-600 dark:text-slate-300">{r.courseName ?? r.courseId}</td>
                  <td className="py-3 pr-6 text-slate-700 dark:text-slate-200">{r.marks}</td>
                  <td className={`py-3 font-bold ${gradeColor(r.grade)}`}>{r.grade}</td>
                </tr>
              ))}
              {!resultsQuery.isLoading && results.length === 0 && (
                <tr><td colSpan={4} className="py-5 text-center text-sm text-slate-500">No results yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </Page>
  )
}

// ── Student View ───────────────────────────────────────────────────────────
function StudentResults() {
  const { data } = useQuery({
    queryKey: ['results'],
    queryFn: async () => (await http.get('/results')).data as { results: ResultRow[] },
  })

  const results = data?.results ?? []
  const totalPct = results.length
    ? Math.round(results.reduce((a, r) => a + r.marks, 0) / results.length)
    : null

  return (
    <Page title="Results" subtitle="Your subject-wise marks and grades."
      actions={
        <button type="button" onClick={() => window.open('/api/reports/results.pdf', '_blank')}
          className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          Download PDF
        </button>
      }>

      {/* Total percentage banner */}
      {totalPct !== null && (
        <div className={`rounded-2xl p-4 text-white ${totalPct >= 60 ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          <div className="text-3xl font-bold">{totalPct}%</div>
          <div className="text-sm opacity-90">Overall Percentage</div>
        </div>
      )}

      <Card>
        <CardHeader title="Subject-wise Results" subtitle="Marks and grade per subject" />
        <CardBody className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 pr-6 font-semibold text-slate-600 dark:text-slate-300">Subject</th>
                <th className="py-3 pr-6 font-semibold text-slate-600 dark:text-slate-300">Assignment</th>
                <th className="py-3 pr-6 font-semibold text-slate-600 dark:text-slate-300">Marks</th>
                <th className="py-3 font-semibold text-slate-600 dark:text-slate-300">Grade</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-900/60">
                  <td className="py-3 pr-6 font-medium text-slate-900 dark:text-slate-50">{r.courseName ?? r.courseId}</td>
                  <td className="py-3 pr-6 text-slate-600 dark:text-slate-300">{r.assignmentTitle ?? '—'}</td>
                  <td className="py-3 pr-6">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-700 dark:text-slate-200">{r.marks}</span>
                      <div className="h-1.5 w-16 rounded-full bg-slate-200 dark:bg-slate-700">
                        <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${r.marks}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className={`py-3 font-bold ${gradeColor(r.grade)}`}>{r.grade}</td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr><td colSpan={4} className="py-5 text-center text-sm text-slate-500">No results yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </Page>
  )
}

// ── Entry Point ────────────────────────────────────────────────────────────
export default function Result() {
  const { user } = useAuthStore()
  if (user?.role === 'admin') return <AdminResults />
  return <StudentResults />
}
