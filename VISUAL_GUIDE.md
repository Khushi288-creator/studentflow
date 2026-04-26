# Visual Guide: Auto-Generated Timetable System

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN CONFIGURATION                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. School Timing Setup                                     │
│     ┌──────────────────────────────────────┐               │
│     │ Start Time:        07:20             │               │
│     │ End Time:          12:20             │               │
│     │ Prayer Duration:   30 min            │               │
│     │ Break Duration:    30 min            │               │
│     │ Break After:       Period 3          │               │
│     └──────────────────────────────────────┘               │
│                         ↓                                    │
│  2. Auto-Generation                                         │
│     ┌──────────────────────────────────────┐               │
│     │ Total Time:     300 min              │               │
│     │ Net Teaching:   240 min              │               │
│     │ Period Count:   6 periods            │               │
│     │ Period Length:  40 min each          │               │
│     └──────────────────────────────────────┘               │
│                         ↓                                    │
│  3. Generated Schedule                                      │
│     ┌──────────────────────────────────────┐               │
│     │ 🤲 Prayer    07:20 - 07:50 (30 min) │               │
│     │ 📚 Period 1  07:50 - 08:30 (40 min) │               │
│     │ 📚 Period 2  08:30 - 09:10 (40 min) │               │
│     │ 📚 Period 3  09:10 - 09:50 (40 min) │               │
│     │ ☕ Break     09:50 - 10:20 (30 min) │               │
│     │ 📚 Period 4  10:20 - 11:00 (40 min) │               │
│     │ 📚 Period 5  11:00 - 11:40 (40 min) │               │
│     │ 📚 Period 6  11:40 - 12:20 (40 min) │               │
│     └──────────────────────────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Teacher Assignment Flow

```
┌─────────────────────────────────────────────────────────────┐
│              SUBJECT-TEACHER MAPPING (Admin)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Class 5 Subjects:                                          │
│  ┌────────────────────────────────────────────┐            │
│  │ Mathematics  →  Mr. Patel                  │            │
│  │ Science      →  Mrs. Shah                  │            │
│  │ English      →  Ms. Desai                  │            │
│  │ Hindi        →  Mr. Kumar                  │            │
│  └────────────────────────────────────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│           TIMETABLE CREATION (Auto-Assignment)               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Admin Creates Timetable Entry:                             │
│  ┌────────────────────────────────────────────┐            │
│  │ Class:    5                                │            │
│  │ Day:      Monday                           │            │
│  │ Subject:  Mathematics  ← [Admin selects]  │            │
│  │           ↓                                │            │
│  │ Teacher:  Mr. Patel    ← [Auto-filled]    │            │
│  │           (read-only, cannot edit)         │            │
│  └────────────────────────────────────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Daily Schedule View

```
┌─────────────────────────────────────────────────────────────┐
│                    MONDAY - CLASS 5                          │
├──────────┬──────────────┬──────────────┬───────────────────┤
│   Time   │    Period    │   Subject    │     Teacher       │
├──────────┼──────────────┼──────────────┼───────────────────┤
│ 07:20    │              │              │                   │
│   ↓      │  🤲 Prayer   │      -       │        -          │
│ 07:50    │              │              │                   │
├──────────┼──────────────┼──────────────┼───────────────────┤
│ 07:50    │              │              │                   │
│   ↓      │ 📚 Period 1  │ Mathematics  │    Mr. Patel      │
│ 08:30    │              │              │                   │
├──────────┼──────────────┼──────────────┼───────────────────┤
│ 08:30    │              │              │                   │
│   ↓      │ 📚 Period 2  │   Science    │    Mrs. Shah      │
│ 09:10    │              │              │                   │
├──────────┼──────────────┼──────────────┼───────────────────┤
│ 09:10    │              │              │                   │
│   ↓      │ 📚 Period 3  │   English    │    Ms. Desai      │
│ 09:50    │              │              │                   │
├──────────┼──────────────┼──────────────┼───────────────────┤
│ 09:50    │              │              │                   │
│   ↓      │  ☕ Break    │      -       │        -          │
│ 10:20    │              │              │                   │
├──────────┼──────────────┼──────────────┼───────────────────┤
│ 10:20    │              │              │                   │
│   ↓      │ 📚 Period 4  │    Hindi     │    Mr. Kumar      │
│ 11:00    │              │              │                   │
├──────────┼──────────────┼──────────────┼───────────────────┤
│ 11:00    │              │              │                   │
│   ↓      │ 📚 Period 5  │   Gujarati   │    Mrs. Mehta     │
│ 11:40    │              │              │                   │
├──────────┼──────────────┼──────────────┼───────────────────┤
│ 11:40    │              │              │                   │
│   ↓      │ 📚 Period 6  │  Computer    │    Mr. Joshi      │
│ 12:20    │              │              │                   │
└──────────┴──────────────┴──────────────┴───────────────────┘
```

## UI Components

### School Config Page
```
┌─────────────────────────────────────────────────────────────┐
│  School Timing Configuration                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐  ┌────────────────────────────┐   │
│  │  Configuration      │  │  Period Schedule           │   │
│  │  ─────────────      │  │  ───────────────           │   │
│  │                     │  │                            │   │
│  │  Start Time         │  │  #  Period      Time       │   │
│  │  [07:20]            │  │  ─────────────────────────  │   │
│  │                     │  │  1  🤲 Prayer   07:20-07:50│   │
│  │  End Time           │  │  2  📚 Period 1 07:50-08:30│   │
│  │  [12:20]            │  │  3  📚 Period 2 08:30-09:10│   │
│  │                     │  │  4  📚 Period 3 09:10-09:50│   │
│  │  Prayer Duration    │  │  5  ☕ Break    09:50-10:20│   │
│  │  [30] minutes       │  │  6  📚 Period 4 10:20-11:00│   │
│  │                     │  │  7  📚 Period 5 11:00-11:40│   │
│  │  Break Duration     │  │  8  📚 Period 6 11:40-12:20│   │
│  │  [30] minutes       │  │                            │   │
│  │                     │  └────────────────────────────┘   │
│  │  Break After        │                                   │
│  │  [3] periods        │  ┌────────────────────────────┐   │
│  │                     │  │  Summary                   │   │
│  │  [Save Config]      │  │  ───────                   │   │
│  │                     │  │  Total Time:    300 min    │   │
│  └─────────────────────┘  │  Prayer:        30 min     │   │
│                           │  Break:         30 min     │   │
│                           │  Net Teaching:  240 min    │   │
│                           │  Periods:       6          │   │
│                           │  Each Period:   40 min     │   │
│                           └────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Timetable Creation Modal
```
┌─────────────────────────────────────────────────────────────┐
│  Add Timetable Entry                                    [✕]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Class *                                                     │
│  [Class 5          ▼]                                       │
│                                                              │
│  Day *                                                       │
│  [Monday           ▼]                                       │
│                                                              │
│  Subject *                                                   │
│  [Mathematics      ▼]  ← Admin selects                      │
│                         ↓                                    │
│  Teacher Name (auto-filled)                                 │
│  [Mr. Patel           ]  ← Auto-filled, read-only          │
│                                                              │
│  Time *                                                      │
│  [10:00 AM            ]                                     │
│                                                              │
│  [        Add Entry        ]                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Color Coding

```
┌─────────────────────────────────────────────────────────────┐
│  Period Type Visual Indicators                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🤲 Prayer                                                   │
│  ┌────────────────────────────────────────┐                │
│  │  Purple Badge                          │                │
│  │  Purple Background                     │                │
│  │  Non-editable                          │                │
│  │  Fixed at start                        │                │
│  └────────────────────────────────────────┘                │
│                                                              │
│  📚 Teaching Period                                          │
│  ┌────────────────────────────────────────┐                │
│  │  Blue Badge                            │                │
│  │  White/Default Background              │                │
│  │  Subject assignable                    │                │
│  │  Teacher auto-assigned                 │                │
│  └────────────────────────────────────────┘                │
│                                                              │
│  ☕ Break                                                    │
│  ┌────────────────────────────────────────┐                │
│  │  Amber Badge                           │                │
│  │  Amber Background                      │                │
│  │  Non-editable                          │                │
│  │  After specified period                │                │
│  └────────────────────────────────────────┘                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB Collections                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  SchoolConfig    │
│  ──────────────  │
│  startTime       │
│  endTime         │
│  prayerDuration  │
│  breakDuration   │
│  periods[]       │
└──────────────────┘
         │
         │ Used by
         ↓
┌──────────────────┐       ┌──────────────────┐
│  Timetable       │       │  ClassSubjects   │
│  ──────────────  │       │  ──────────────  │
│  class           │       │  class           │
│  day             │       │  subjects[]      │
│  subject         │←──────│    - name        │
│  time            │ Maps  │    - teacherId   │
│  teacherId       │       └──────────────────┘
│  teacherName     │                 │
└──────────────────┘                 │
                                     │ References
                                     ↓
                              ┌──────────────────┐
                              │  User            │
                              │  ──────────────  │
                              │  _id             │
                              │  name            │
                              │  role: teacher   │
                              └──────────────────┘
```

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPLETE WORKFLOW                         │
└─────────────────────────────────────────────────────────────┘

Step 1: Admin configures school timing
   ↓
Step 2: System auto-generates period schedule
   ↓
Step 3: Admin assigns teachers to subjects (per class)
   ↓
Step 4: Admin creates timetable entries
   ↓
Step 5: System auto-assigns teacher based on subject
   ↓
Step 6: Students/Teachers view complete schedule

┌─────────────────────────────────────────────────────────────┐
│  RESULT: Complete Daily Schedule                            │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ✅ Prayer time (fixed)                                     │
│  ✅ Teaching periods (with subjects & teachers)             │
│  ✅ Break time (fixed)                                      │
│  ✅ All times auto-calculated                               │
│  ✅ No manual time entry needed                             │
│  ✅ Consistent across all classes                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Benefits Visualization

```
┌─────────────────────────────────────────────────────────────┐
│                    BEFORE vs AFTER                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  BEFORE (Manual System)                                     │
│  ─────────────────────                                      │
│  ❌ Admin manually enters each period time                  │
│  ❌ Risk of time conflicts                                  │
│  ❌ Inconsistent schedules across classes                   │
│  ❌ Manual teacher selection (prone to errors)              │
│  ❌ No prayer/break enforcement                             │
│  ❌ Time-consuming setup                                    │
│                                                              │
│  AFTER (Auto-Generated System)                              │
│  ──────────────────────────                                 │
│  ✅ One-time school timing configuration                    │
│  ✅ All period times auto-calculated                        │
│  ✅ Zero time conflicts                                     │
│  ✅ Consistent schedules across all classes                 │
│  ✅ Teacher auto-assigned from subject mapping              │
│  ✅ Prayer & break guaranteed                               │
│  ✅ Quick and error-free setup                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```
