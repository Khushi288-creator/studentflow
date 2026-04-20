import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { http } from '../../api/http'
import { useAuthStore } from '../../store/authStore'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import { DEFAULT_SUBJECTS } from '../../lib/defaultSubjects'

type Assignment = {
  id: string
  courseId: string
  title: string
  description: string
  dueDate: string
}

type Course = { id: string; name: string }

type Submission = {
  id: string
  studentName: string
  subject: string
  fileUrl: string
  marks: number | null
  submittedAt: string
}

type Material = { id: string; fileUrl: string }

// Fetch and show materials for an assignment
function MaterialsRow({ assignmentId }: { assignmentId: string }) {
  const { data } = useQuery({
    queryKey: ['materials', assignmentId],
    queryFn: async () => (await http.get(`/assignments/${assignmentId}/materials`)).data as { materials: Material[] },
  })
  const materials = data?.materials ?? []
  if (materials.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {materials.map((m, i) => {
        const filename = m.fileUrl.split('/').pop() ?? `File ${i + 1}`
        return (
          <a key={m.id} href={`/api${m.fileUrl}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-300">
            📎 {filename.length > 30 ? filename.slice(0, 30) + '…' : filename}
          </a>
        )
      })}
    </div>
  )
}

// Teacher: submissions panel — defined OUTSIDE main component to avoid remount
function SubmissionsPanel({ assignmentId }: { assignmentId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['submissions', assignmentId],
    queryFn: async () => {
      const res = await http.get(`/assignments/${assignmentId}/submissions`)
      return res.data as { submissions: Submission[] }
    },
  })

  const submissions = data?.submissions ?? []

  if (isLoading) return <p className="text-xs text-slate-500">Loading submissions...</p>
  if (submissions.length === 0) return <p className="text-xs text-slate-500">No submissions yet.</p>

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
            <th className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">Student</th>
            <th className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">Subject</th>
            <th className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">Submitted</th>
            <th className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">Marks</th>
            <th className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">File</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s.id} className="border-b border-slate-100 dark:border-slate-900/60">
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">{s.studentName}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.subject}</td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                {new Date(s.submittedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                {s.marks != null ? (
                  <span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
                    {s.marks}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <a
                  href={s.fileUrl.startsWith('/uploads') ? s.fileUrl : `/api${s.fileUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Assignments() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const search = useMemo(() => new URLSearchParams(location.search), [location.search])
  const courseId = search.get('courseId') ?? ''

  const [fileById, setFileById] = useState<Record<string, File | undefined>>({})

  // Fetch already-submitted assignment IDs from backend (persists across refresh)
  const submissionsQuery = useQuery({
    queryKey: ['mySubmissions'],
    queryFn: async () => {
      const res = await http.get('/assignments/my-submissions')
      return res.data as { submittedIds: string[] }
    },
    enabled: user?.role === 'student',
  })
  const [localSubmittedIds, setLocalSubmittedIds] = useState<Set<string>>(new Set())
  const submittedIds = new Set([
    ...(submissionsQuery.data?.submittedIds ?? []),
    ...localSubmittedIds,
  ])

  // Teacher: create assignment state
  const [showCreate, setShowCreate] = useState(false)
  const [newCourseId, setNewCourseId] = useState('')
  const [newClassName, setNewClassName] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newDue, setNewDue] = useState('')
  const [materialFile, setMaterialFile] = useState<File | null>(null)

  const coursesQuery = useQuery({
    queryKey: ['teacherCourses'],
    queryFn: async () => {
      const res = await http.get('/courses?scope=teacher')
      return res.data as { courses: Course[] }
    },
    enabled: user?.role === 'teacher',
  })

  const classesQuery = useQuery({
    queryKey: ['adminClasses'],
    queryFn: async () => (await http.get('/admin/classes')).data as { classes: string[] },
    enabled: user?.role === 'teacher',
  })
  // Merge DB subjects with defaults — same logic as Courses page
  const dbCourses = coursesQuery.data?.courses ?? []
  const dbNames = new Set(dbCourses.map((c) => c.name.toLowerCase()))
  const courseList = [
    ...DEFAULT_SUBJECTS.filter((s) => !dbNames.has(s.name.toLowerCase())),
    ...dbCourses,
  ]

  const [createSuccess, setCreateSuccess] = useState(false)

  const createMutation = useMutation({
    mutationFn: async (body: { courseId: string; className: string; title: string; description: string; dueDate: string; file: File | null }) => {
      let resolvedCourseId = body.courseId
      if (body.courseId.startsWith('default-')) {
        const subjectName = DEFAULT_SUBJECTS.find((s) => s.id === body.courseId)?.name ?? 'Subject'
        const res = await http.post('/courses/ensure', { name: subjectName })
        resolvedCourseId = res.data.course.id
      }
      const res = await http.post('/assignments', {
        courseId: resolvedCourseId,
        title: body.title,
        description: body.description,
        dueDate: body.dueDate,
        className: body.className || undefined,
      })
      const assignment = (res.data as { assignment: { id: string } }).assignment

      if (body.file) {
        const form = new FormData()
        form.append('file', body.file)
        await http.post(`/assignments/${assignment.id}/materials`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      return assignment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['teacherCourses'] })
      setNewTitle('')
      setNewDesc('')
      setNewDue('')
      setNewCourseId('')
      setNewClassName('')
      setMaterialFile(null)
      setCreateSuccess(true)
      setTimeout(() => setCreateSuccess(false), 3000)
    },
  })

  const submitMutation = useMutation({
    mutationFn: async (payload: { assignmentId: string; file: File }) => {
      const form = new FormData()
      form.append('file', payload.file)
      const res = await http.post(`/assignments/${payload.assignmentId}/submit`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return { ...res.data, assignmentId: payload.assignmentId }
    },
    onSuccess: (data) => {
      setLocalSubmittedIds((prev) => new Set(prev).add(data.assignmentId))
      setFileById((prev) => { const next = { ...prev }; delete next[data.assignmentId]; return next })
      queryClient.invalidateQueries({ queryKey: ['mySubmissions'] })
    },
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['assignments', { courseId }],
    queryFn: async () => {
      const res = await http.get('/assignments', { params: { courseId } })
      return res.data as { assignments: Assignment[] }
    },
  })

  const assignments = data?.assignments ?? []

  return (
    <Page
      title="Assignments"
      subtitle={user?.role === 'teacher' ? 'Manage assignments and view submissions.' : 'Submit your work before the due date.'}
      actions={
        user?.role === 'student' ? (
          <button
            type="button"
            onClick={() => navigate('/results')}
            className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            View Results
          </button>
        ) : user?.role === 'teacher' ? (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {showCreate ? 'Cancel' : '+ Create Assignment'}
          </button>
        ) : null
      }
    >
      {/* Teacher: create assignment form */}
      {user?.role === 'teacher' && showCreate ? (
        <Card className="mb-4">
          <CardHeader title="Create Assignment" subtitle="Fill in details and save" />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Subject</span>
                <select
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                >
                  <option value="">Select subject...</option>
                  {courseList.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Class <span className="text-slate-400 font-normal">(optional — leave blank for all)</span>
                </span>
                <select
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                >
                  <option value="">All classes</option>
                  {(classesQuery.data?.classes ?? []).map((c) => (
                    <option key={c} value={c}>Class {c}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Title</span>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Chapter 3 Test"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Due Date</span>
                <input
                  type="date"
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                />
              </label>
              <label className="grid gap-2 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Description</span>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  placeholder="What should students do?"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                />
              </label>
              <label className="grid gap-2 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Attach Material <span className="text-slate-400 font-normal">(optional)</span>
                </span>
                <input
                  type="file"
                  onChange={(e) => setMaterialFile(e.target.files?.[0] ?? null)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                />
                {materialFile && (
                  <p className="text-xs text-slate-500">Selected: {materialFile.name}</p>
                )}
              </label>
              <div className="sm:col-span-2 flex items-center gap-3">
                <button
                  type="button"
                  disabled={!newCourseId || !newTitle || !newDesc || !newDue || createMutation.isPending}
                  onClick={() => createMutation.mutate({ courseId: newCourseId, className: newClassName, title: newTitle, description: newDesc, dueDate: newDue, file: materialFile })}
                  className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {createMutation.isPending ? (materialFile ? 'Creating & Uploading...' : 'Creating...') : 'Create Assignment'}
                </button>
                {createSuccess ? (
                  <span className="text-xs font-semibold text-emerald-600">Created successfully.</span>
                ) : null}
                {createMutation.isError ? (
                  <span className="text-xs font-semibold text-rose-600">Failed. Try again.</span>
                ) : null}
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}
      {isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Could not load assignments yet.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {isLoading ? <div className="text-sm text-slate-500">Loading assignments...</div> : null}

        {assignments.map((a) => (
          <Card key={a.id}>
            <CardHeader
              title={a.title}
              subtitle={`Due: ${a.dueDate}`}
              right={
                <div className="rounded-xl bg-indigo-600/10 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  Assignment
                </div>
              }
            />
            <CardBody className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">{a.description}</p>

              {/* Material files — visible to all */}
              <MaterialsRow assignmentId={a.id} />

              {user?.role === 'student' ? (
                submittedIds.has(a.id) ? (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Submitted
                  </div>
                ) : (
                <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Submit File</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setFileById((prev) => ({ ...prev, [a.id]: e.target.files?.[0] }))}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={!fileById[a.id] || submitMutation.isPending}
                    onClick={() => {
                      const file = fileById[a.id]
                      if (!file) return
                      submitMutation.mutate({ assignmentId: a.id, file })
                    }}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {submitMutation.isPending ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
                )
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Submissions
                  </div>
                  <SubmissionsPanel assignmentId={a.id} />
                </div>
              )}
            </CardBody>
          </Card>
        ))}

        {!isLoading && assignments.length === 0 ? (
          <Card className="border-dashed bg-white/40 p-8 text-center text-sm text-slate-500 dark:bg-slate-950/20">
            No assignments found. Ask admin/teacher to create assignments.
          </Card>
        ) : null}
      </div>
    </Page>
  )
}

