import express from 'express'
import { z } from 'zod'
import { authenticateJWT, requireRole } from '../middleware/auth'
import ClassSubjectsModel from '../models/ClassSubjects'

const router = express.Router()

// Default subjects per class
const DEFAULT_SUBJECTS: Record<number, string[]> = {
  4: ['English', 'Hindi', 'Gujarati', 'Computer', 'Maths', 'Drawing', 'General Knowledge'],
  5: ['English', 'Hindi', 'Gujarati', 'Computer', 'Maths', 'Drawing', 'General Knowledge'],
  6: ['English', 'Hindi', 'Gujarati', 'Computer', 'Maths', 'Drawing', 'General Knowledge', 'Sanskrit', 'Science', 'Social Science'],
  7: ['English', 'Hindi', 'Gujarati', 'Computer', 'Maths', 'Drawing', 'General Knowledge', 'Sanskrit', 'Science', 'Social Science'],
  8: ['English', 'Hindi', 'Gujarati', 'Computer', 'Maths', 'Drawing', 'General Knowledge', 'Sanskrit', 'Science', 'Social Science'],
}

// Ensure defaults exist for a class (called on GET so data is always there)
async function ensureDefaults(classNum: number) {
  const existing = await ClassSubjectsModel.findOne({ class: classNum })
  if (existing) return existing

  const subjects = (DEFAULT_SUBJECTS[classNum] ?? []).map(name => ({ name, teacherId: null }))
  return ClassSubjectsModel.create({ class: classNum, subjects })
}

// ── GET /subjects/my-class — student/parent: only their class subjects ────
router.get('/subjects/my-class', authenticateJWT, async (req, res) => {
  try {
    const { userId, role } = req.auth!
    let classNum: number | null = null

    if (role === 'student') {
      // Get student's class from their profile
      const StudentProfileModel = require('../models/StudentProfile').default
      const profile = await StudentProfileModel.findOne({ userId })
      if (!profile || !profile.className) {
        return res.status(404).json({ message: 'Student profile or class not found' })
      }
      // className is stored as string like "4", "5", etc.
      classNum = parseInt(profile.className)
    } else if (role === 'parent') {
      // Get parent's child's class
      const ParentProfileModel = require('../models/ParentProfile').default
      const StudentProfileModel = require('../models/StudentProfile').default
      const UserModel = require('../models/User').default
      
      const parentProfile = await ParentProfileModel.findOne({ userId })
      if (!parentProfile || !parentProfile.studentId) {
        return res.status(404).json({ message: 'Parent profile or linked student not found' })
      }
      
      // Get student user to find their profile
      const studentUser = await UserModel.findOne({ uniqueId: parentProfile.studentId })
      if (!studentUser) {
        return res.status(404).json({ message: 'Linked student not found' })
      }
      
      const studentProfile = await StudentProfileModel.findOne({ userId: studentUser._id.toString() })
      if (!studentProfile || !studentProfile.className) {
        return res.status(404).json({ message: 'Student class not found' })
      }
      
      classNum = parseInt(studentProfile.className)
    } else {
      return res.status(403).json({ message: 'Only students and parents can access this endpoint' })
    }

    if (isNaN(classNum) || classNum < 4 || classNum > 8) {
      return res.status(400).json({ message: 'Invalid class number' })
    }

    const doc = await ensureDefaults(classNum)
    
    // Fetch teacher names for subjects that have teacherId
    const UserModel = require('../models/User').default
    const subjectsWithTeachers = await Promise.all(
      doc.subjects.map(async (s: any) => {
        let teacherName = null
        if (s.teacherId) {
          const teacher = await UserModel.findById(s.teacherId)
          teacherName = teacher ? teacher.name : null
        }
        return {
          name: s.name,
          teacherId: s.teacherId ?? null,
          teacherName,
        }
      })
    )

    res.json({
      class: doc.class,
      subjects: subjectsWithTeachers,
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── GET /subjects/class/:class — admin/teacher: any class ────────────────
router.get('/subjects/class/:class', authenticateJWT, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const classNum = parseInt(req.params.class as string)
    if (isNaN(classNum) || classNum < 4 || classNum > 8) {
      return res.status(400).json({ message: 'Class must be between 4 and 8' })
    }

    const doc = await ensureDefaults(classNum)
    
    // Fetch teacher names for subjects that have teacherId
    const UserModel = require('../models/User').default
    const subjectsWithTeachers = await Promise.all(
      doc.subjects.map(async (s: any) => {
        let teacherName = null
        if (s.teacherId) {
          const teacher = await UserModel.findById(s.teacherId)
          teacherName = teacher ? teacher.name : null
        }
        return {
          name: s.name,
          teacherId: s.teacherId ?? null,
          teacherName,
        }
      })
    )

    res.json({
      class: doc.class,
      subjects: subjectsWithTeachers,
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── GET /subjects/all — all classes (admin only) ─────────────────────────
router.get('/subjects/all', authenticateJWT, requireRole(['admin']), async (_req, res) => {
  try {
    // Ensure all classes have defaults
    await Promise.all([4, 5, 6, 7, 8].map(ensureDefaults))
    const docs = await ClassSubjectsModel.find({}).sort({ class: 1 }).lean()
    
    // Fetch teacher names
    const UserModel = require('../models/User').default
    const classesWithTeachers = await Promise.all(
      docs.map(async (d: any) => {
        const subjectsWithTeachers = await Promise.all(
          d.subjects.map(async (s: any) => {
            let teacherName = null
            if (s.teacherId) {
              const teacher = await UserModel.findById(s.teacherId)
              teacherName = teacher ? teacher.name : null
            }
            return {
              name: s.name,
              teacherId: s.teacherId ?? null,
              teacherName,
            }
          })
        )
        return {
          class: d.class,
          subjects: subjectsWithTeachers,
        }
      })
    )
    
    res.json({ classes: classesWithTeachers })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── POST /subjects/add — admin only ──────────────────────────────────────
router.post('/subjects/add', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const schema = z.object({
      class:     z.number().int().min(4).max(8),
      name:      z.string().min(1, 'Subject name required').transform(s => s.trim()),
      teacherId: z.string().optional().nullable(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const { class: classNum, name, teacherId } = parsed.data

    const doc = await ensureDefaults(classNum)

    // Check duplicate (case-insensitive)
    const duplicate = doc.subjects.some(
      (s: any) => s.name.toLowerCase() === name.toLowerCase()
    )
    if (duplicate) {
      return res.status(409).json({ message: `"${name}" already exists in Class ${classNum}` })
    }

    doc.subjects.push({ name, teacherId: teacherId ?? null } as any)
    await doc.save()

    res.status(201).json({
      message: `"${name}" added to Class ${classNum}`,
      class: doc.class,
      subjects: doc.subjects.map((s: any) => ({ name: s.name, teacherId: s.teacherId ?? null })),
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── DELETE /subjects/remove — admin only ─────────────────────────────────
router.delete('/subjects/remove', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const schema = z.object({
      class: z.number().int().min(4).max(8),
      name:  z.string().min(1),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const { class: classNum, name } = parsed.data

    const doc = await ClassSubjectsModel.findOne({ class: classNum })
    if (!doc) return res.status(404).json({ message: 'Class not found' })

    const before = doc.subjects.length
    doc.subjects = doc.subjects.filter(
      (s: any) => s.name.toLowerCase() !== name.toLowerCase()
    ) as any
    if (doc.subjects.length === before) {
      return res.status(404).json({ message: `"${name}" not found in Class ${classNum}` })
    }

    await doc.save()
    res.json({ message: `"${name}" removed from Class ${classNum}` })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── POST /subjects/seed — seed all defaults (admin) ───────────────────────
router.post('/subjects/seed', authenticateJWT, requireRole(['admin']), async (_req, res) => {
  try {
    await Promise.all([4, 5, 6, 7, 8].map(ensureDefaults))
    res.json({ message: 'Default subjects seeded for all classes (4–8)' })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── PUT /subjects/assign-teacher — assign teacher to subject (admin) ──────
router.put('/subjects/assign-teacher', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const schema = z.object({
      class:     z.number().int().min(4).max(8),
      subject:   z.string().min(1),
      teacherId: z.string().nullable(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message })

    const { class: classNum, subject, teacherId } = parsed.data

    const doc = await ClassSubjectsModel.findOne({ class: classNum })
    if (!doc) return res.status(404).json({ message: 'Class not found' })

    // Find the subject
    const subjectIndex = doc.subjects.findIndex(
      (s: any) => s.name.toLowerCase() === subject.toLowerCase()
    )
    if (subjectIndex === -1) {
      return res.status(404).json({ message: `Subject "${subject}" not found in Class ${classNum}` })
    }

    // Verify teacher exists if teacherId is provided
    if (teacherId) {
      const UserModel = require('../models/User').default
      const teacher = await UserModel.findById(teacherId)
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(404).json({ message: 'Teacher not found' })
      }
    }

    // Update teacher assignment
    doc.subjects[subjectIndex].teacherId = teacherId
    await doc.save()

    res.json({
      message: teacherId 
        ? `Teacher assigned to "${subject}" in Class ${classNum}` 
        : `Teacher removed from "${subject}" in Class ${classNum}`,
    })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

// ── GET /subjects/my-assigned — teacher: get assigned subjects ────────────
router.get('/subjects/my-assigned', authenticateJWT, requireRole(['teacher']), async (req, res) => {
  try {
    const { userId } = req.auth!
    
    // Find all subjects assigned to this teacher across all classes
    const allClasses = await ClassSubjectsModel.find({}).lean()
    
    const assignedSubjects: Array<{ class: number; subject: string }> = []
    
    for (const classDoc of allClasses as any[]) {
      for (const subject of classDoc.subjects) {
        if (subject.teacherId === userId) {
          assignedSubjects.push({
            class: classDoc.class,
            subject: subject.name,
          })
        }
      }
    }
    
    res.json({ subjects: assignedSubjects })
  } catch (err: any) {
    res.status(500).json({ message: err?.message })
  }
})

export default router
