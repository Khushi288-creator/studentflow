import { useState } from 'react'
import { Card, CardBody, CardHeader } from '../../../components/ui/Card'
import { type StudentDetails } from '../useStudentDashboardData'
import { type AuthUser } from '../../../store/authStore'

function displayValue(v: string | undefined) {
  const s = v?.trim()
  return s ? s : '—'
}

export default function StudentBioCard({
  authUser,
  student,
}: {
  authUser: AuthUser | null
  student: StudentDetails | undefined
}) {
  const [imgError, setImgError] = useState(false)

  // Reset error state if photoUrl changes (e.g. after re-upload)
  const photoSrcRef = student?.photoUrl ?? null

  // Debug: log student data to verify photoUrl is coming through
  if (student) console.log('[StudentBioCard] student data:', student)

  const personalRows: { label: string; value?: string }[] = [
    { label: "Gender", value: student?.gender },
    { label: "Father's Name", value: student?.fatherName },
    { label: "Mother's Name", value: student?.motherName },
    { label: 'Date of Birth', value: student?.dob },
    { label: 'Religion', value: student?.religion },
    { label: 'Father Occupation', value: student?.fatherOccupation },
    { label: 'Address', value: student?.address },
    { label: 'Class', value: student?.className },
  ]

  const hasAny = Boolean(authUser || student)
  if (!hasAny) {
    return (
      <Card className="h-full min-h-0 overflow-hidden">
        <CardHeader title="Student Bio" subtitle="Profile & personal details" />
        <CardBody>
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/40 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-400">
            No student data available
          </div>
        </CardBody>
      </Card>
    )
  }

  // Resolve photo URL — photoUrl from DB is like "/uploads/photos/file.jpg"
  // Vite proxies /uploads → localhost:4000, so it works as-is in dev
  const photoSrc = photoSrcRef
  const showPhoto = !!photoSrc && !imgError

  return (
    <Card className="overflow-hidden">
      <CardHeader title="Student Bio" subtitle="Profile & personal details" />
      <CardBody className="space-y-2">
        <div className="flex min-h-0 items-start gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-indigo-500/40 bg-indigo-500/10 shadow-lg shadow-indigo-500/20">
            {showPhoto ? (
              <img
                src={photoSrc}
                alt={authUser?.name ?? 'Student'}
                className="h-full w-full object-cover"
                onError={() => {
                  console.warn('[StudentBioCard] photo failed to load:', photoSrc)
                  setImgError(true)
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-indigo-400">
                {authUser?.name?.charAt(0).toUpperCase() ?? '?'}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
              {authUser?.name ?? '—'}
            </div>
            <div className="mt-0.5 grid gap-0.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="truncate">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Email:</span>{' '}
                {authUser?.email
                  ? <a href={`mailto:${authUser.email}`} className="hover:underline text-indigo-600 dark:text-indigo-400">{authUser.email}</a>
                  : '—'}
              </div>
              <div className="truncate">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Phone:</span>{' '}
                {student?.phone ?? '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-white/8 pt-2">
          <div className="mb-1 text-[11px] font-semibold text-slate-500">Personal details</div>
          <div className="grid gap-0.5">
            {personalRows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[minmax(0,44%)_minmax(0,56%)] items-baseline gap-x-2 gap-y-0 text-[11px] leading-tight"
              >
                <span className="shrink-0 text-slate-500">{row.label}</span>
                <span className="min-w-0 break-words font-medium text-slate-700 dark:text-slate-200">
                  {displayValue(row.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
