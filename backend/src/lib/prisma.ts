// MongoDB/Mongoose wrapper — exports a prisma-compatible object so all routes work unchanged.
import mongoose from 'mongoose'
import 'dotenv/config'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/studentDB'

if (mongoose.connection.readyState === 0) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('[mongoose] MongoDB connected ✅'))
    .catch((err) => console.error('[mongoose] connection error:', err))
}

import UserModel from '../models/User'
import TeacherModel from '../models/Teacher'
import StudentProfileModel from '../models/StudentProfile'
import StudentEnrollmentModel from '../models/StudentEnrollment'
import CourseModel from '../models/Course'
import AssignmentModel from '../models/Assignment'
import AssignmentMaterialModel from '../models/AssignmentMaterial'
import SubmissionModel from '../models/Submission'
import AttendanceModel from '../models/Attendance'
import AttendanceQrTokenModel from '../models/AttendanceQrToken'
import ResultModel from '../models/Result'
import FeeModel from '../models/Fee'
import FeeStructureModel from '../models/FeeStructure'
import EventModel from '../models/Event'
import EventRegistrationModel from '../models/EventRegistration'
import NoticeModel from '../models/Notice'
import NoticeReadModel from '../models/NoticeRead'
import DoubtModel from '../models/Doubt'
import ResumeModel from '../models/Resume'
import StudyTaskModel from '../models/StudyTask'
import TimetableModel from '../models/Timetable'
import PasswordResetTokenModel from '../models/PasswordResetToken'
import ContactMessageModel from '../models/ContactMessage'
import HolidayModel from '../models/Holiday'
import AchievementModel from '../models/Achievement'
import SalaryModel from '../models/Salary'
import ActivityModel from '../models/Activity'
import ActivityFacultyModel from '../models/ActivityFaculty'
import ActivityEnrollmentModel from '../models/ActivityEnrollment'
import ActivityAttendanceModel from '../models/ActivityAttendance'
import ActivityCertificateModel from '../models/ActivityCertificate'
import ParentProfileModel from '../models/ParentProfile'
import ParentMeetingModel from '../models/ParentMeeting'
import ParentMessageModel from '../models/ParentMessage'
import PerformanceModel from '../models/Performance'

// ── helpers ────────────────────────────────────────────────────────────────

function addId(doc: any) {
  if (!doc) return null
  const obj = { ...doc }
  if (obj._id) obj.id = obj._id.toString()
  return obj
}

function buildQuery(where: any): any {
  if (!where) return {}
  const query: any = {}
  for (const [key, value] of Object.entries(where)) {
    if (key === 'id') {
      query._id = value
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      const ops = value as any
      if (ops.in !== undefined)      query[key] = { $in: ops.in }
      else if (ops.notIn !== undefined) query[key] = { $nin: ops.notIn }
      else if (ops.contains !== undefined) query[key] = { $regex: ops.contains, $options: 'i' }
      else if (ops.not !== undefined) query[key] = { $ne: ops.not }
      else if (ops.gte !== undefined || ops.lte !== undefined || ops.gt !== undefined || ops.lt !== undefined) {
        query[key] = {}
        if (ops.gte !== undefined) query[key].$gte = ops.gte
        if (ops.lte !== undefined) query[key].$lte = ops.lte
        if (ops.gt  !== undefined) query[key].$gt  = ops.gt
        if (ops.lt  !== undefined) query[key].$lt  = ops.lt
      } else {
        query[key] = value
      }
    } else {
      query[key] = value
    }
  }
  return query
}

function buildSort(orderBy: any): any {
  if (!orderBy) return {}
  const items = Array.isArray(orderBy) ? orderBy : [orderBy]
  const sort: any = {}
  for (const item of items) {
    for (const [k, v] of Object.entries(item)) {
      sort[k === 'id' ? '_id' : k] = v === 'desc' ? -1 : 1
    }
  }
  return sort
}

// ── relation maps ──────────────────────────────────────────────────────────

function getRelatedModel(modelName: string, relation: string): any {
  const map: Record<string, Record<string, any>> = {
    User: {
      teacher: TeacherModel, studentProfile: StudentProfileModel,
      studentEnrollments: StudentEnrollmentModel, resume: ResumeModel,
      studyTasks: StudyTaskModel, doubts: DoubtModel,
      eventRegistrations: EventRegistrationModel, noticeReads: NoticeReadModel,
      contactMessages: ContactMessageModel, passwordResetTokens: PasswordResetTokenModel,
      achievements: AchievementModel, salaries: SalaryModel,
      activityEnrollments: ActivityEnrollmentModel, parentProfile: ParentProfileModel,
    },
    Teacher: { courses: CourseModel, user: UserModel },
    Course: {
      teacher: TeacherModel, assignments: AssignmentModel,
      studentEnrollments: StudentEnrollmentModel, attendance: AttendanceModel,
      results: ResultModel, attendanceQrTokens: AttendanceQrTokenModel,
    },
    StudentEnrollment: {
      user: UserModel, course: CourseModel, submissions: SubmissionModel,
      attendance: AttendanceModel, results: ResultModel, fees: FeeModel, doubts: DoubtModel,
    },
    Assignment: { course: CourseModel, submissions: SubmissionModel, materials: AssignmentMaterialModel },
    Activity: {
      faculty: ActivityFacultyModel, enrollments: ActivityEnrollmentModel,
      attendance: ActivityAttendanceModel, certificates: ActivityCertificateModel,
    },
    ParentProfile: { meetings: ParentMeetingModel, messages: ParentMessageModel, user: UserModel },
    ParentMeeting: { teacher: UserModel, parent: ParentProfileModel },
  }
  return map[modelName]?.[relation] ?? null
}

function getRelation(modelName: string, relation: string): { foreignKey: string; localKey?: string } {
  const map: Record<string, Record<string, any>> = {
    User: {
      teacher:             { foreignKey: 'userId',    localKey: 'id' },
      studentProfile:      { foreignKey: 'userId',    localKey: 'id' },
      studentEnrollments:  { foreignKey: 'userId',    localKey: 'id' },
      resume:              { foreignKey: 'userId',    localKey: 'id' },
      studyTasks:          { foreignKey: 'userId',    localKey: 'id' },
      doubts:              { foreignKey: 'userId',    localKey: 'id' },
      eventRegistrations:  { foreignKey: 'userId',    localKey: 'id' },
      noticeReads:         { foreignKey: 'userId',    localKey: 'id' },
      contactMessages:     { foreignKey: 'userId',    localKey: 'id' },
      passwordResetTokens: { foreignKey: 'userId',    localKey: 'id' },
      achievements:        { foreignKey: 'studentId', localKey: 'id' },
      salaries:            { foreignKey: 'teacherId', localKey: 'id' },
      activityEnrollments: { foreignKey: 'studentId', localKey: 'id' },
      parentProfile:       { foreignKey: 'userId',    localKey: 'id' },
    },
    Teacher: {
      courses: { foreignKey: 'teacherId', localKey: 'id' },
      user:    { foreignKey: '_id',       localKey: 'userId' },
    },
    Course: {
      assignments:        { foreignKey: 'courseId',  localKey: 'id' },
      studentEnrollments: { foreignKey: 'courseId',  localKey: 'id' },
      attendance:         { foreignKey: 'courseId',  localKey: 'id' },
      results:            { foreignKey: 'courseId',  localKey: 'id' },
      attendanceQrTokens: { foreignKey: 'courseId',  localKey: 'id' },
      teacher:            { foreignKey: '_id',       localKey: 'teacherId' },
    },
    StudentEnrollment: {
      submissions: { foreignKey: 'studentId', localKey: 'id' },
      attendance:  { foreignKey: 'studentId', localKey: 'id' },
      results:     { foreignKey: 'studentId', localKey: 'id' },
      fees:        { foreignKey: 'studentId', localKey: 'id' },
      doubts:      { foreignKey: 'studentId', localKey: 'id' },
      user:        { foreignKey: '_id',       localKey: 'userId' },
      course:      { foreignKey: '_id',       localKey: 'courseId' },
    },
    Assignment: {
      submissions: { foreignKey: 'assignmentId', localKey: 'id' },
      materials:   { foreignKey: 'assignmentId', localKey: 'id' },
      course:      { foreignKey: '_id',          localKey: 'courseId' },
    },
    Activity: {
      faculty:      { foreignKey: 'activityId', localKey: 'id' },
      enrollments:  { foreignKey: 'activityId', localKey: 'id' },
      attendance:   { foreignKey: 'activityId', localKey: 'id' },
      certificates: { foreignKey: 'activityId', localKey: 'id' },
    },
    ParentProfile: {
      meetings: { foreignKey: 'parentId', localKey: 'id' },
      messages: { foreignKey: 'parentId', localKey: 'id' },
      user:     { foreignKey: '_id',      localKey: 'userId' },
    },
    ParentMeeting: {
      teacher: { foreignKey: '_id', localKey: 'teacherId' },
      parent:  { foreignKey: '_id', localKey: 'parentId'  },
    },
  }
  return map[modelName]?.[relation] ?? { foreignKey: 'id' }
}

function isArrayRelation(modelName: string, relation: string): boolean {
  const arr: Record<string, string[]> = {
    User:             ['studentEnrollments','studyTasks','doubts','eventRegistrations','noticeReads','contactMessages','passwordResetTokens','achievements','salaries','activityEnrollments'],
    Teacher:          ['courses'],
    Course:           ['assignments','studentEnrollments','attendance','results','attendanceQrTokens'],
    StudentEnrollment:['submissions','attendance','results','fees','doubts'],
    Assignment:       ['submissions','materials'],
    Activity:         ['faculty','enrollments','attendance','certificates'],
    ParentProfile:    ['meetings','messages'],
  }
  return arr[modelName]?.includes(relation) ?? false
}

async function populateIncludes(doc: any, include: any, modelName: string) {
  if (!doc || !include) return
  for (const [key, val] of Object.entries(include)) {
    if (!val) continue
    const relModel = getRelatedModel(modelName, key)
    if (!relModel) continue
    const { foreignKey, localKey } = getRelation(modelName, key)
    const localVal = localKey ? doc[localKey] : doc.id
    if (localVal == null) { doc[key] = isArrayRelation(modelName, key) ? [] : null; continue }

    const nestedInclude = typeof val === 'object' && (val as any).include ? (val as any).include : null
    const nestedSelect  = typeof val === 'object' && (val as any).select  ? (val as any).select  : null

    if (isArrayRelation(modelName, key)) {
      const docs = await relModel.find({ [foreignKey]: localVal }).lean()
      doc[key] = docs.map(addId)
      if (nestedInclude) {
        for (const d of doc[key]) await populateIncludes(d, nestedInclude, relModel.modelName)
      }
    } else {
      const related = await relModel.findOne({ [foreignKey]: localVal }).lean()
      doc[key] = related ? addId(related) : null
      if (doc[key] && nestedInclude) await populateIncludes(doc[key], nestedInclude, relModel.modelName)
      if (doc[key] && nestedSelect)  applySelect(doc[key], nestedSelect)
    }
  }
}

function applySelect(doc: any, select: any) {
  if (!doc || !select) return
  for (const key of Object.keys(doc)) {
    if (key === 'id' || key === '_id') continue
    if (!select[key]) delete doc[key]
  }
}

// ── generic model factory ──────────────────────────────────────────────────

function makeModel(Model: any) {
  const name = Model.modelName
  return {
    async findUnique({ where, include, select }: any = {}) {
      const doc = await Model.findOne(buildQuery(where)).lean()
      if (!doc) return null
      const plain = addId(doc)
      if (include) await populateIncludes(plain, include, name)
      if (select)  applySelect(plain, select)
      return plain
    },
    async findFirst({ where, orderBy, include, select }: any = {}) {
      let q = Model.findOne(buildQuery(where || {}))
      if (orderBy) q = q.sort(buildSort(orderBy))
      const doc = await q.lean()
      if (!doc) return null
      const plain = addId(doc)
      if (include) await populateIncludes(plain, include, name)
      if (select)  applySelect(plain, select)
      return plain
    },
    async findMany({ where, orderBy, include, select, take, skip, distinct }: any = {}) {
      let q = Model.find(buildQuery(where || {}))
      if (orderBy) q = q.sort(buildSort(orderBy))
      if (skip)    q = q.skip(skip)
      if (take)    q = q.limit(take)
      const docs = await q.lean()
      let plains = docs.map(addId)
      if (distinct) {
        const seen = new Set<string>()
        plains = plains.filter((p: any) => {
          const key = distinct.map((f: string) => p[f]).join('|')
          if (seen.has(key)) return false
          seen.add(key); return true
        })
      }
      if (include) for (const p of plains) await populateIncludes(p, include, name)
      if (select)  plains.forEach((p: any) => applySelect(p, select))
      return plains
    },
    async create({ data, include, select }: any) {
      const doc = await Model.create(data)
      const plain = addId(doc.toObject())
      if (include) await populateIncludes(plain, include, name)
      if (select)  applySelect(plain, select)
      return plain
    },
    async update({ where, data, include, select }: any) {
      const doc = await Model.findOneAndUpdate(buildQuery(where), { $set: data }, { new: true }).lean()
      if (!doc) return null
      const plain = addId(doc)
      if (include) await populateIncludes(plain, include, name)
      if (select)  applySelect(plain, select)
      return plain
    },
    async updateMany({ where, data }: any) {
      const result = await Model.updateMany(buildQuery(where || {}), { $set: data })
      return { count: result.modifiedCount }
    },
    async upsert({ where, create, update, include }: any) {
      const existing = await Model.findOne(buildQuery(where)).lean()
      let doc: any
      if (existing) {
        doc = await Model.findOneAndUpdate(buildQuery(where), { $set: update }, { new: true }).lean()
      } else {
        const created = await Model.create({ ...buildQuery(where), ...create })
        doc = created.toObject()
      }
      const plain = addId(doc)
      if (include) await populateIncludes(plain, include, name)
      return plain
    },
    async delete({ where }: any) {
      const doc = await Model.findOneAndDelete(buildQuery(where)).lean()
      return doc ? addId(doc) : null
    },
    async deleteMany({ where }: any = {}) {
      const result = await Model.deleteMany(buildQuery(where || {}))
      return { count: result.deletedCount }
    },
    async count({ where }: any = {}) {
      return Model.countDocuments(buildQuery(where || {}))
    },
  }
}

// ── exported prisma-compatible client ─────────────────────────────────────

export const prisma = {
  user:                makeModel(UserModel),
  teacher:             makeModel(TeacherModel),
  studentProfile:      makeModel(StudentProfileModel),
  studentEnrollment:   makeModel(StudentEnrollmentModel),
  course:              makeModel(CourseModel),
  assignment:          makeModel(AssignmentModel),
  assignmentMaterial:  makeModel(AssignmentMaterialModel),
  submission:          makeModel(SubmissionModel),
  attendance:          makeModel(AttendanceModel),
  attendanceQrToken:   makeModel(AttendanceQrTokenModel),
  result:              makeModel(ResultModel),
  fee:                 makeModel(FeeModel),
  feeStructure:        makeModel(FeeStructureModel),
  event:               makeModel(EventModel),
  eventRegistration:   makeModel(EventRegistrationModel),
  notice:              makeModel(NoticeModel),
  noticeRead:          makeModel(NoticeReadModel),
  doubt:               makeModel(DoubtModel),
  resume:              makeModel(ResumeModel),
  studyTask:           makeModel(StudyTaskModel),
  timetable:           makeModel(TimetableModel),
  passwordResetToken:  makeModel(PasswordResetTokenModel),
  contactMessage:      makeModel(ContactMessageModel),
  holiday:             makeModel(HolidayModel),
  achievement:         makeModel(AchievementModel),
  salary:              makeModel(SalaryModel),
  activity:            makeModel(ActivityModel),
  activityFaculty:     makeModel(ActivityFacultyModel),
  activityEnrollment:  makeModel(ActivityEnrollmentModel),
  activityAttendance:  makeModel(ActivityAttendanceModel),
  activityCertificate: makeModel(ActivityCertificateModel),
  parentProfile:       makeModel(ParentProfileModel),
  parentMeeting:       makeModel(ParentMeetingModel),
  parentMessage:       makeModel(ParentMessageModel),
  performance:         makeModel(PerformanceModel),
  $transaction: async (fn: (tx: any) => Promise<any>) => fn(prisma),
  $disconnect:  async () => mongoose.disconnect(),
}

export default prisma
