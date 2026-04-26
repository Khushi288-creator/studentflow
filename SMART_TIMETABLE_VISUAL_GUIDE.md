# Smart Timetable System - Visual Guide

## UI Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Smart Timetable Builder                    [Clear All] [Save Timetable]│
│  Build complete class timetable with auto-assigned teachers             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐  ┌────────────────────────────────────────────────────┐  │
│  │ SELECT   │  │  CLASS 5 TIMETABLE                                 │  │
│  │ CLASS    │  │  Assign subjects - teachers auto-assigned          │  │
│  │          │  ├────────────────────────────────────────────────────┤  │
│  │ [Class 4]│  │                                                    │  │
│  │ [Class 5]│  │  Day/Period │ Period 1  │ Period 2  │ Period 3   │  │
│  │ [Class 6]│  │             │ 07:50-    │ 08:30-    │ 09:10-     │  │
│  │ [Class 7]│  │             │ 08:30     │ 09:10     │ 09:50      │  │
│  │ [Class 8]│  ├─────────────┼───────────┼───────────┼────────────┤  │
│  │          │  │ Monday      │[Math   ▼] │[Science▼] │[English ▼] │  │
│  │ ──────── │  │             │           │           │            │  │
│  │ RULES    │  ├─────────────┼───────────┼───────────┼────────────┤  │
│  │          │  │ Tuesday     │[Hindi  ▼] │[Math   ▼] │[Computer▼] │  │
│  │ ✓ Fill   │  │             │           │ 2x today  │            │  │
│  │   all    │  ├─────────────┼───────────┼───────────┼────────────┤  │
│  │   slots  │  │ Wednesday   │[Science▼] │[English▼] │[Hindi   ▼] │  │
│  │          │  │             │           │           │            │  │
│  │ ✓ Max 2  │  ├─────────────┼───────────┼───────────┼────────────┤  │
│  │   same   │  │ Thursday    │[Math   ▼] │[Computer▼]│[Science ▼] │  │
│  │   subj/  │  │             │           │           │            │  │
│  │   day    │  ├─────────────┼───────────┼───────────┼────────────┤  │
│  │          │  │ Friday      │[English▼] │[Hindi  ▼] │[Math    ▼] │  │
│  │ ✓ Teacher│  │             │           │           │ 2x today   │  │
│  │   auto-  │  ├─────────────┼───────────┼───────────┼────────────┤  │
│  │   assign │  │ Saturday    │[Computer▼]│[Science▼] │[English ▼] │  │
│  │          │  │             │           │           │            │  │
│  └──────────┘  └────────────────────────────────────────────────────┘  │
│                                                                          │
│                ┌────────────────────────────────────────────────────┐  │
│                │  SUMMARY                                           │  │
│                │  6 Periods/Day  │  6 School Days  │  8 Subjects   │  │
│                └────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Validation States

### Empty Slot (Invalid)
```
┌─────────────────────────┐
│ [Select subject...    ▼]│  ← Red border
│                         │     Rose background
└─────────────────────────┘
```

### Valid Slot
```
┌─────────────────────────┐
│ [Mathematics          ▼]│  ← Normal border
│                         │     White background
└─────────────────────────┘
```

### Over-Limit Slot (Invalid)
```
┌─────────────────────────┐
│ [Mathematics          ▼]│  ← Red border
│ 3x today ⚠️             │     Warning text
└─────────────────────────┘
```

### Repeated but Valid
```
┌─────────────────────────┐
│ [Mathematics          ▼]│  ← Normal border
│ 2x today                │     Gray text (info)
└─────────────────────────┘
```

## Validation Error Display

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  Validation Errors                                      │
├─────────────────────────────────────────────────────────────┤
│  • 3 empty slot(s) found. Please fill all slots.           │
│  • "Mathematics" appears 3 times on Monday. Max 2 per day.  │
│  • "Science" appears 3 times on Wednesday. Max 2 per day.   │
└─────────────────────────────────────────────────────────────┘
```

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    SMART TIMETABLE WORKFLOW                  │
└─────────────────────────────────────────────────────────────┘

Step 1: Prerequisites Setup
┌──────────────────────────────────────────────────────────┐
│  Admin → School Timing                                   │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Start: 07:20  End: 12:20                          │  │
│  │ Prayer: 30 min  Break: 30 min                     │  │
│  │ [Save Configuration]                              │  │
│  └────────────────────────────────────────────────────┘  │
│                         ↓                                 │
│  System Generates:                                       │
│  • Prayer: 07:20-07:50                                   │
│  • Period 1: 07:50-08:30                                 │
│  • Period 2: 08:30-09:10                                 │
│  • Period 3: 09:10-09:50                                 │
│  • Break: 09:50-10:20                                    │
│  • Period 4: 10:20-11:00                                 │
│  • Period 5: 11:00-11:40                                 │
│  • Period 6: 11:40-12:20                                 │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  Admin → Class Subjects                                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Class 5 Subjects:                                 │  │
│  │ Mathematics  →  Mr. Patel                         │  │
│  │ Science      →  Mrs. Shah                         │  │
│  │ English      →  Ms. Desai                         │  │
│  │ Hindi        →  Mr. Kumar                         │  │
│  │ Computer     →  Mr. Joshi                         │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                         ↓
Step 2: Build Timetable
┌──────────────────────────────────────────────────────────┐
│  Admin → Smart Timetable                                 │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 1. Select Class: [Class 5]                        │  │
│  │                                                    │  │
│  │ 2. Fill Grid:                                     │  │
│  │    Monday Period 1: [Mathematics ▼]               │  │
│  │    Monday Period 2: [Science     ▼]               │  │
│  │    Monday Period 3: [English     ▼]               │  │
│  │    ... (continue for all days/periods)            │  │
│  │                                                    │  │
│  │ 3. Validation (Real-time):                        │  │
│  │    ✓ All slots filled                             │  │
│  │    ✓ No subject > 2x per day                      │  │
│  │                                                    │  │
│  │ 4. [Save Timetable]                               │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                         ↓
Step 3: System Processing
┌──────────────────────────────────────────────────────────┐
│  Backend Processing:                                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 1. Validate completeness (36 slots filled)        │  │
│  │ 2. Validate repetition (max 2 per day)            │  │
│  │ 3. Delete old timetable for Class 5               │  │
│  │ 4. For each slot:                                 │  │
│  │    - Lookup teacher for subject                   │  │
│  │    - Create timetable entry                       │  │
│  │    - Auto-assign teacher                          │  │
│  │ 5. Notify all Class 5 students                    │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                         ↓
Step 4: Result
┌──────────────────────────────────────────────────────────┐
│  ✓ Timetable saved successfully for Class 5              │
│  36 entries created                                      │
│                                                          │
│  Students can now view their complete weekly schedule   │
└──────────────────────────────────────────────────────────┘
```

## Data Flow Visualization

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA FLOW DIAGRAM                         │
└─────────────────────────────────────────────────────────────┘

Frontend State:
┌──────────────────────────────────────┐
│  timetableGrid = {                   │
│    "Monday": {                       │
│      1: "Mathematics",               │
│      2: "Science",                   │
│      3: "English",                   │
│      4: "Mathematics",               │
│      5: "Hindi",                     │
│      6: "Computer"                   │
│    },                                │
│    "Tuesday": { ... },               │
│    ...                               │
│  }                                   │
└──────────────────────────────────────┘
         ↓ (User clicks Save)
┌──────────────────────────────────────┐
│  Transform to API format:            │
│  [                                   │
│    {                                 │
│      day: "Monday",                  │
│      periodNumber: 1,                │
│      timeSlot: "07:50 - 08:30",      │
│      subject: "Mathematics"          │
│    },                                │
│    { ... },                          │
│    ...                               │
│  ]                                   │
└──────────────────────────────────────┘
         ↓ (POST /timetable/smart/save)
┌──────────────────────────────────────┐
│  Backend Processing:                 │
│                                      │
│  For each entry:                     │
│    1. Get teacher for subject        │
│       ClassSubjects.find({           │
│         class: 5,                    │
│         "subjects.name": "Math"      │
│       })                             │
│       → teacherId: "user_123"        │
│                                      │
│    2. Create timetable entry         │
│       Timetable.create({             │
│         class: "5",                  │
│         day: "Monday",               │
│         subject: "Mathematics",      │
│         time: "07:50 - 08:30",       │
│         teacherId: "user_123",       │
│         teacherName: "Mr. Patel"     │
│       })                             │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Database (MongoDB):                 │
│                                      │
│  Timetable Collection:               │
│  [                                   │
│    {                                 │
│      _id: "...",                     │
│      type: "regular",                │
│      class: "5",                     │
│      day: "Monday",                  │
│      subject: "Mathematics",         │
│      time: "07:50 - 08:30",          │
│      teacherId: "user_123",          │
│      teacherName: "Mr. Patel"        │
│    },                                │
│    { ... },                          │
│    ...                               │
│  ]                                   │
└──────────────────────────────────────┘
```

## Validation Logic Flowchart

```
┌─────────────────────────────────────────────────────────────┐
│                  VALIDATION FLOWCHART                        │
└─────────────────────────────────────────────────────────────┘

User clicks "Save Timetable"
         ↓
┌────────────────────────┐
│ Count filled slots     │
└────────────────────────┘
         ↓
    ┌─────────┐
    │ All     │ NO → Show error: "X empty slots found"
    │ filled? │      Highlight empty dropdowns
    └─────────┘      STOP
         ↓ YES
┌────────────────────────┐
│ For each day:          │
│   Count each subject   │
└────────────────────────┘
         ↓
    ┌─────────┐
    │ Any     │ YES → Show error: "Subject X appears 3x on Day Y"
    │ > 2x?   │       Highlight over-limit dropdowns
    └─────────┘       STOP
         ↓ NO
┌────────────────────────┐
│ Build API payload      │
└────────────────────────┘
         ↓
┌────────────────────────┐
│ POST to backend        │
└────────────────────────┘
         ↓
    ┌─────────┐
    │ Success?│ NO → Show error toast
    └─────────┘      Display error message
         ↓ YES
┌────────────────────────┐
│ Show success toast     │
│ Refresh timetable      │
│ Clear validation errors│
└────────────────────────┘
```

## Example: Complete Monday Schedule

```
┌─────────────────────────────────────────────────────────────┐
│  CLASS 5 - MONDAY TIMETABLE                                  │
├──────────┬──────────────┬──────────────┬────────────────────┤
│  Time    │  Period      │  Subject     │  Teacher (Auto)    │
├──────────┼──────────────┼──────────────┼────────────────────┤
│ 07:20    │              │              │                    │
│   ↓      │  🤲 Prayer   │      -       │        -           │
│ 07:50    │              │              │                    │
├──────────┼──────────────┼──────────────┼────────────────────┤
│ 07:50    │              │              │                    │
│   ↓      │ 📚 Period 1  │ Mathematics  │    Mr. Patel       │
│ 08:30    │              │              │                    │
├──────────┼──────────────┼──────────────┼────────────────────┤
│ 08:30    │              │              │                    │
│   ↓      │ 📚 Period 2  │   Science    │    Mrs. Shah       │
│ 09:10    │              │              │                    │
├──────────┼──────────────┼──────────────┼────────────────────┤
│ 09:10    │              │              │                    │
│   ↓      │ 📚 Period 3  │   English    │    Ms. Desai       │
│ 09:50    │              │              │                    │
├──────────┼──────────────┼──────────────┼────────────────────┤
│ 09:50    │              │              │                    │
│   ↓      │  ☕ Break    │      -       │        -           │
│ 10:20    │              │              │                    │
├──────────┼──────────────┼──────────────┼────────────────────┤
│ 10:20    │              │              │                    │
│   ↓      │ 📚 Period 4  │ Mathematics  │    Mr. Patel       │
│ 11:00    │              │              │    (2x today)      │
├──────────┼──────────────┼──────────────┼────────────────────┤
│ 11:00    │              │              │                    │
│   ↓      │ 📚 Period 5  │    Hindi     │    Mr. Kumar       │
│ 11:40    │              │              │                    │
├──────────┼──────────────┼──────────────┼────────────────────┤
│ 11:40    │              │              │                    │
│   ↓      │ 📚 Period 6  │  Computer    │    Mr. Joshi       │
│ 12:20    │              │              │                    │
└──────────┴──────────────┴──────────────┴────────────────────┘

Validation Status:
✅ All 6 teaching periods filled
✅ Mathematics appears 2x (within limit)
✅ All other subjects appear 1x
✅ Teachers auto-assigned for all subjects
```

## Color Coding Reference

```
┌─────────────────────────────────────────────────────────────┐
│  VISUAL INDICATORS                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Empty Slot (Invalid)                                       │
│  ┌──────────────────────────────────────┐                  │
│  │ [Select subject...              ▼]  │                  │
│  │  ↑                                   │                  │
│  │  Red border (#ef4444)                │                  │
│  │  Rose background (#fef2f2)           │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  Valid Slot                                                 │
│  ┌──────────────────────────────────────┐                  │
│  │ [Mathematics                    ▼]  │                  │
│  │  ↑                                   │                  │
│  │  Normal border (#e2e8f0)             │                  │
│  │  White background (#ffffff)          │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  Over-Limit Slot (Invalid)                                 │
│  ┌──────────────────────────────────────┐                  │
│  │ [Mathematics                    ▼]  │                  │
│  │ 3x today ⚠️                          │                  │
│  │  ↑                                   │                  │
│  │  Red border (#ef4444)                │                  │
│  │  Rose background (#fef2f2)           │                  │
│  │  Red text (#dc2626)                  │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  Repeated but Valid                                         │
│  ┌──────────────────────────────────────┐                  │
│  │ [Mathematics                    ▼]  │                  │
│  │ 2x today                             │                  │
│  │  ↑                                   │                  │
│  │  Normal border (#e2e8f0)             │                  │
│  │  Gray text (#94a3b8)                 │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Mobile Responsive View

```
┌─────────────────────────────────┐
│  Smart Timetable Builder        │
│  [Clear] [Save]                 │
├─────────────────────────────────┤
│  Class: [5 ▼]                   │
├─────────────────────────────────┤
│  Day: [Monday ▼]                │
├─────────────────────────────────┤
│  Period 1 (07:50-08:30)         │
│  [Mathematics            ▼]     │
│                                 │
│  Period 2 (08:30-09:10)         │
│  [Science                ▼]     │
│                                 │
│  Period 3 (09:10-09:50)         │
│  [English                ▼]     │
│                                 │
│  Period 4 (10:20-11:00)         │
│  [Mathematics            ▼]     │
│  2x today                       │
│                                 │
│  Period 5 (11:00-11:40)         │
│  [Hindi                  ▼]     │
│                                 │
│  Period 6 (11:40-12:20)         │
│  [Computer               ▼]     │
│                                 │
│  [Next Day →]                   │
└─────────────────────────────────┘
```
