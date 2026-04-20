import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticateJWT, requireRole } from '../middleware/auth'

const router = express.Router()

router.get('/courses', authenticateJWT, async (req, res) => {
  const role = req.auth!.role
  const scope = (req.query.scope as string | undefined) ?? ''

  if (role === 'admin' && scope === 'teacher') {
    // Admin can query all courses with scope as an extra option.
  }

  // Teacher: either scope=teacher or by role.
  if (role === 'teacher' || scope === 'teacher') {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.auth!.userId },
      select: { id: true },
    })
    if (!teacher) return res.json({ courses: [] })
    const courses = await prisma.course.findMany({
      where: { teacherId: teacher.id },
      include: {
        teacher: false,
      },
    })
    return res.json({
      courses: courses.map((c) => ({ id: c.id, name: c.name })),
    })
  }

  if (role === 'student') {
    // Return ALL courses with teacher names so Subjects page shows teacher info
    const allCourses = await prisma.course.findMany({
      include: { teacher: { include: { user: { select: { name: true } } } } },
    })
    return res.json({
      courses: allCourses.map((c) => ({
        id: c.id,
        name: c.name,
        teacherName: c.teacher.user.name,
      })),
    })
  }

  // Admin: show all courses.
  const courses = await prisma.course.findMany({
    include: {
      teacher: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
  })
  return res.json({
    courses: courses.map((c) => ({
      id: c.id,
      name: c.name,
      teacherName: c.teacher.user.name,
    })),
  })
})

// Teacher: ensure a subject exists by name (create if not found)
router.post('/courses/ensure', authenticateJWT, requireRole(['teacher']), async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ message: 'name required' })

  const teacher = await prisma.teacher.findUnique({
    where: { userId: req.auth!.userId },
    select: { id: true },
  })
  if (!teacher) return res.status(403).json({ message: 'Teacher profile missing' })

  // Find existing course with this name for this teacher
  let course = await prisma.course.findFirst({
    where: { name: { equals: name }, teacherId: teacher.id },
  })

  if (!course) {
    course = await prisma.course.create({
      data: { name, teacherId: teacher.id },
    })
  }

  res.json({ course: { id: course.id, name: course.name } })
})

export default router

