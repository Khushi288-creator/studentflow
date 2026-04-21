# StudentFlow — School Management System

A full-stack school management platform for students, teachers, admins, and parents.
Manage attendance, assignments, fees, results, timetables, and more — all in one place.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Features by Role](#features-by-role)
4. [Project Structure](#project-structure)
5. [Setup on a New PC](#setup-on-a-new-pc)
6. [How to Run the Project](#how-to-run-the-project)
7. [How the Output Looks](#how-the-output-looks)
8. [How to View Stored Data (Prisma Studio)](#how-to-view-stored-data-prisma-studio)
9. [How Real Data Gets Created](#how-real-data-gets-created)
10. [Environment Variables](#environment-variables)
11. [Troubleshooting](#troubleshooting)
12. [Database Models](#database-models)
13. [API Routes](#api-routes)

---

## Project Overview

**StudentFlow** is a modern school management system with four user roles:

| Role    | Description |
|---------|-------------|
| Admin   | Full control — create students, teachers, manage fees, salary, timetable |
| Teacher | Manage courses, mark attendance via QR, grade assignments |
| Student | View courses, submit assignments, track fees & attendance |
| Parent  | View child's progress, schedule meetings with teachers |

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI framework |
| Vite | Build tool & dev server |
| Tailwind CSS v4 | Styling |
| React Router v7 | Client-side routing |
| TanStack Query v5 | Server state & data fetching |
| Zustand | Global auth state |
| React Hook Form + Zod | Form handling & validation |
| Recharts | Charts & analytics |
| Axios | HTTP client |
| QRCode.react | QR code generation |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express 5 | REST API server |
| TypeScript | Type safety |
| Prisma ORM | Database access layer |
| SQLite (better-sqlite3) | Local database (no external DB needed) |
| JWT | Authentication tokens |
| Bcrypt | Password hashing |
| Multer | File uploads |
| PDFKit | PDF report generation |

---

## Features by Role

### Admin
- Dashboard with system-wide stats
- Add / edit / delete students and teachers
- Manage subjects/courses
- Set fee structures and track payments
- Manage teacher salaries (HRA, bonus, deductions)
- Create timetables (regular & exam)
- Post notices and announcements
- Manage school events and holidays
- View and reply to contact messages
- Generate PDF reports

### Teacher
- Dashboard with class overview
- Create courses and post assignments
- Mark attendance via QR code
- Grade student submissions
- Reply to student doubts
- View salary slips

### Student
- Dashboard with attendance %, pending assignments, fee status
- View enrolled courses and submit assignments
- Track attendance and view results
- Pay fees, register for events
- Ask doubts, view timetable and holidays
- AI chat assistant, achievements, resume builder

### Parent
- View child's attendance and results
- Schedule meetings with teachers
- Message teachers directly

---

## Project Structure

```
studentflow-main/
├── backend/
│   ├── src/
│   │   ├── app.ts              # Express app — middleware + routes
│   │   ├── index.ts            # Server entry point
│   │   ├── seed.ts             # Creates only the admin account
│   │   ├── lib/prisma.ts       # Prisma client instance
│   │   ├── middleware/auth.ts  # JWT auth middleware
│   │   └── routes/             # All API route files
│   ├── prisma/
│   │   └── schema.prisma       # Database schema (all models)
│   ├── generated/prisma/       # Auto-generated Prisma client (do not edit)
│   ├── uploads/                # Uploaded files (photos, assignments)
│   ├── dev.db                  # SQLite database file (all real data stored here)
│   ├── .env                    # Environment variables
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.tsx             # All routes defined here
    │   ├── api/http.ts         # Axios base instance
    │   ├── components/         # Layout, guards, UI components
    │   ├── pages/              # admin/, teacher/, student/, shared/
    │   └── store/              # Zustand auth store
    └── package.json
```

---

## Setup on a New PC

### Step 1 — Install Prerequisites

1. **Node.js v18+** → https://nodejs.org (verify: `node -v`)
2. **Git** → https://git-scm.com

---

### Step 2 — Get the Project

Clone from GitHub:
```bash
git clone https://github.com/Khushi288-creator/studentflow.git
cd studentflow-main
```
---

### Step 3 — Backend Setup

Open a terminal in the `backend` folder:

```bash
cd studentflow-main/backend
```

**3a. Install dependencies:**
```bash
npm install
```

**3b. Create `.env` file** inside `backend/` folder.

A `.env.example` file is already included in the project. Just copy it:

```bash
# Windows (Command Prompt)
copy .env.example .env

# Windows (Git Bash / PowerShell)
cp .env.example .env
```

The `.env` file will look like this:

```env
DATABASE_URL="file:./dev.db"
PORT=4000
NODE_ENV=development
JWT_ACCESS_SECRET=supersecretjwtkey123
GROQ_API_KEY=
```

**What each variable means:**

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | SQLite file path — `file:./dev.db` works as-is, no changes needed |
| `PORT` | ✅ Yes | Backend server port — keep it `4000` |
| `NODE_ENV` | ✅ Yes | Keep as `development` |
| `JWT_ACCESS_SECRET` | ✅ Yes | Any random string — used to sign login tokens |
| `GROQ_API_KEY` | ❌ Optional | AI chat key — leave empty, fallback responses work without it |

> `DATABASE_URL="file:./dev.db"` means the database file (`dev.db`) will be auto-created inside the `backend/` folder. No external database, no MongoDB, no PostgreSQL needed — everything is local.

**3c. Generate Prisma client:**
```bash
npx prisma generate
```

**3d. Run database migrations** (creates all tables in `dev.db`):
```bash
npx prisma migrate deploy
```

**3e. Create admin account:**
```bash
npm run seed
```

Output:
```
✅ Admin created
   Admin → admin@school.com / admin123
```

---

### Step 4 — Frontend Setup

Open a **new terminal** in the `frontend` folder:

```bash
cd studentflow-main/frontend
npm install
```

---

## How to Run the Project

You need **two terminals open at the same time**.

**Terminal 1 — Start Backend:**
```bash
cd studentflow-main/backend
npm run dev
```
You will see:
```
[prisma] sqlite db = .../backend/dev.db
[server] running on http://localhost:4000
```

**Terminal 2 — Start Frontend:**
```bash
cd studentflow-main/frontend
npm run dev
```
You will see:
```
  VITE v6.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

Now open your browser and go to: **http://localhost:5173**

---

## How the Output Looks

### Landing Page — `http://localhost:5173`
The home page of StudentFlow with navigation to Login and Signup.

### Login — `http://localhost:5173/login`
Login with admin credentials:
- **Email:** `admin@school.com`
- **Password:** `admin123`

### After Login — Dashboard
Each role sees a different dashboard:

**Admin Dashboard** shows:
- Total students, teachers, courses count
- Fee collection stats
- Recent notices and events

**Teacher Dashboard** shows:
- Courses they teach
- Pending assignment submissions
- Attendance overview

**Student Dashboard** shows:
- Attendance percentage
- Pending assignments
- Fee payment status
- Upcoming events

### Pages Available by Role

| Page | URL | Who Can Access |
|------|-----|----------------|
| Home | `/` | Public |
| Login | `/login` | Public |
| Dashboard | `/dashboard` | All roles |
| Courses | `/courses` | All roles |
| Assignments | `/assignments` | All roles |
| Attendance | `/attendance` | All roles |
| Results | `/results` | All roles |
| Fees | `/fees` | Student / Admin |
| Events | `/events` | All roles |
| Holidays | `/holidays` | All roles |
| Notifications | `/notifications` | All roles |
| Profile | `/profile` | All roles |
| Contact | `/contact` | All roles |
| Achievements | `/achievements` | Student |
| Salary | `/salary` | Teacher |
| Admin → Students | `/admin/students` | Admin only |
| Admin → Teachers | `/admin/teachers` | Admin only |
| Admin → Subjects | `/admin/subjects` | Admin only |
| Admin → Salary | `/admin/salary` | Admin only |
| Admin → Timetable | `/admin/timetable` | Admin only |

---

## How to View Stored Data (Prisma Studio)

Prisma Studio is a visual database browser — you can see all stored data in the browser.

**Run this command** (backend terminal):
```bash
cd studentflow-main/backend
npx prisma studio
```

Opens at: **http://localhost:5555**

### What you will see:

On the left side — list of all tables:
```
User
Teacher
StudentProfile
StudentEnrollment
Course
Assignment
Attendance
Result
Fee
FeeStructure
Notice
Event
Timetable
Salary
Achievement
Doubt
...and more
```

Click any table to see all rows of data stored in it.

### Example — After admin adds a student:
- `User` table → new row with student name, email, role = "student"
- `StudentProfile` table → row with father name, class, DOB, phone
- `StudentEnrollment` table → row linking student to a course

### Example — After teacher marks attendance:
- `Attendance` table → rows with studentId, courseId, date, status (present/absent/late)

### Example — After admin sets fees:
- `Fee` table → rows with amount, paidAmount, status (paid/pending/overdue)

> Every action done in the app is immediately visible in Prisma Studio. Just refresh the table after performing an action.

---

## How Real Data Gets Created

The seed script only creates the **admin account**. All other data is created through the app by the admin, teachers, and students — and stored directly in `dev.db`.

### Admin creates:

| What | Where in App |
|------|-------------|
| Students | Admin → Students → Add Student |
| Teachers | Admin → Teachers → Add Teacher |
| Courses/Subjects | Admin → Subjects → Add Subject |
| Fee Structure | Admin → Fees → Fee Structure |
| Notices | Admin → Notifications → New Notice |
| Events | Admin → Events → Add Event |
| Holidays | Admin → Holidays → Add Holiday |
| Timetable entries | Admin → Timetable → Add Entry |
| Teacher Salaries | Admin → Salary → Add Salary |

### Teacher creates:
| What | Where in App |
|------|-------------|
| Assignments | Courses → Select Course → Add Assignment |
| Attendance | Attendance → Generate QR → Students scan |
| Results/Grades | Results → Add Result |
| Doubt replies | Contact / Doubts section |

### Student creates:
| What | Where in App |
|------|-------------|
| Assignment submissions | Assignments → Submit |
| Doubts | Doubts section |
| Event registrations | Events → Register |
| Study tasks | Dashboard |

> Everything is stored in `dev.db` (SQLite). View it anytime with `npx prisma studio`.

---

## How Student/Teacher Login Works

When admin creates a student, the system auto-generates a unique ID like `STU001`, `STU002`, etc.

Students and teachers log in using:
- **Login ID:** their unique ID (e.g., `STU001`) — shown to admin after creation
- **Password:** the password admin set during creation

Admin can see all student IDs in: **Admin → Students**

---

## Environment Variables

The project includes a `.env.example` file in the `backend/` folder. Copy it to `.env` before running:

```bash
cp .env.example .env   # Mac/Linux/Git Bash
copy .env.example .env  # Windows CMD
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ Yes | `file:./dev.db` | SQLite file — no changes needed, auto-created locally |
| `PORT` | ✅ Yes | `4000` | Backend server port |
| `NODE_ENV` | ✅ Yes | `development` | Environment mode |
| `JWT_ACCESS_SECRET` | ✅ Yes | any string | Secret key for login tokens — change in production |
| `GROQ_API_KEY` | ❌ Optional | empty | AI chat — leave blank, fallback works without it |

> No external database setup needed. SQLite stores everything in a single file (`backend/dev.db`) on your local machine.

---

## Troubleshooting

**ECONNREFUSED — frontend can't connect to backend:**
- Backend is not running. Start it: `cd backend && npm run dev`
- Make sure it shows `[server] running on http://localhost:4000`

**"Cannot find module" on backend start:**
```bash
cd backend
npm install
npx prisma generate
npm run dev
```

**"Table does not exist" Prisma error:**
```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

**Database is empty in Prisma Studio:**
- Run `npm run seed` to create the admin account
- Then log in as admin and create students/teachers from the dashboard

**Frontend blank page:**
- Check backend is running on port 4000
- Open browser console (F12) for errors

**Reset everything and start fresh:**
```bash
cd studentflow-main/backend
npx prisma migrate reset --force
npm run seed
```

**Port already in use:**
- Backend: change `PORT=4001` in `.env`, update `vite.config.ts` proxy to `http://localhost:4001`
- Frontend: Vite auto-picks another port, press `y` to accept

---

## Database Models

| Model | Description |
|---|---|
| User | Core user — student, teacher, admin, parent |
| Teacher | Teacher profile with subject and personal details |
| StudentProfile | Extended student info (father name, DOB, class, etc.) |
| StudentEnrollment | Links a student to a course |
| Course | Subject/course created by a teacher |
| Assignment | Assignment posted for a course |
| AssignmentMaterial | Files attached to an assignment |
| Submission | Student file submission for an assignment |
| Attendance | Daily attendance record per student per course |
| AttendanceQrToken | Time-limited QR token for marking attendance |
| Result | Marks and grade per student per course |
| Fee | Fee record per student (tuition, exam, transport) |
| FeeStructure | Admin-defined fee template per class |
| Event | School events with registration |
| EventRegistration | Student/teacher event sign-up |
| Notice | School announcements and notices |
| Doubt | Student question with teacher reply |
| Resume | Student resume (headline, summary, skills) |
| Timetable | Regular and exam schedule |
| Holiday | School holiday calendar |
| Achievement | Student awards and achievements |
| Salary | Teacher monthly salary with HRA, bonus, deductions |
| ContactMessage | Contact form messages with admin reply |
| Activity | Skill hub activities |
| ParentProfile | Parent account linked to a student |
| ParentMeeting | Meeting requests between parent and teacher |
| Performance | Student performance tracking |

---

## API Routes

All routes prefixed with `/api`.

| Method | Route | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login and get JWT |
| GET | `/me` | Get current user |
| GET | `/dashboard` | Role-based dashboard stats |
| GET/POST | `/courses` | List / create courses |
| GET/POST | `/assignments` | List / create assignments |
| POST | `/assignments/:id/submit` | Submit assignment |
| GET/POST | `/attendance` | View / mark attendance |
| POST | `/attendance/qr/generate` | Generate QR token |
| POST | `/attendance/qr/scan` | Scan QR to mark present |
| GET/POST | `/results` | View / add results |
| GET/POST | `/fees` | View / manage fees |
| GET/POST | `/events` | View / create events |
| GET/POST | `/notifications` | View / post notices |
| GET/PUT | `/profile` | View / update profile |
| GET/POST | `/achievements` | View / add achievements |
| GET/POST | `/timetable` | View / manage timetable |
| GET/POST | `/holidays` | View / add holidays |
| GET/POST | `/salary` | View / manage salary |
| GET | `/admin/students` | List all students |
| GET | `/admin/teachers` | List all teachers |
| POST | `/assistant/chat` | AI chat assistant |

---

## Author

Built with React, Node.js, Prisma, and TailwindCSS
