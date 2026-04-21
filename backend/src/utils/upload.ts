import multer from 'multer'
import path from 'path'
import fs from 'fs'

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

const submissionsDir = path.join(process.cwd(), 'uploads', 'submissions')
const materialsDir = path.join(process.cwd(), 'uploads', 'materials')
const photosDir = path.join(process.cwd(), 'uploads', 'photos')

ensureDir(submissionsDir)
ensureDir(materialsDir)
ensureDir(photosDir)

function storageFor(dir: string) {
  return multer.diskStorage({
    destination: dir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '') || ''
      const base = path.basename(file.originalname || 'file', ext)
      const safeBase = base.replace(/[^a-zA-Z0-9_-]/g, '_')
      const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`
      cb(null, `${safeBase}_${unique}${ext}`.toLowerCase())
    },
  })
}

export const submissionUpload = multer({
  storage: storageFor(submissionsDir),
  limits: { fileSize: 10 * 1024 * 1024 },
})

export const materialsUpload = multer({
  storage: storageFor(materialsDir),
  limits: { fileSize: 20 * 1024 * 1024 },
})

export const photoUpload = multer({
  storage: storageFor(photosDir),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only image files allowed'))
  },
})

