import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AttendanceStatus = 'present' | 'absent' | 'late'

export type TeacherAttendanceRecord = {
  studentName: string
  courseId: string
  courseName?: string
  date: string
  status: AttendanceStatus
}

type AttendanceStore = {
  records: TeacherAttendanceRecord[]
  addRecords: (records: TeacherAttendanceRecord[]) => void
  getRecordsForStudent: (studentName: string) => TeacherAttendanceRecord[]
}

export const useAttendanceStore = create<AttendanceStore>()(
  persist(
    (set, get) => ({
      records: [],

      addRecords: (incoming) => {
        set((state) => {
          const merged = [...state.records]
          for (const rec of incoming) {
            const idx = merged.findIndex(
              (r) =>
                r.studentName.toLowerCase() === rec.studentName.toLowerCase() &&
                r.courseId === rec.courseId &&
                r.date === rec.date,
            )
            if (idx >= 0) merged[idx] = rec
            else merged.push(rec)
          }
          return { records: merged }
        })
      },

      getRecordsForStudent: (studentName) => {
        return get().records.filter(
          (r) => r.studentName.toLowerCase() === studentName.toLowerCase(),
        )
      },
    }),
    {
      name: 'sms_attendance_records', // localStorage key
    },
  ),
)
