# Teacher Clash Prevention - Visual Guide

## Clash Detection Visualization

### Scenario 1: Clash Detected ❌

```
┌─────────────────────────────────────────────────────────────┐
│                    EXISTING SCHEDULES                        │
└─────────────────────────────────────────────────────────────┘

CLASS 6 - MONDAY
┌──────────────┬──────────────┬──────────────┐
│ Time         │ Subject      │ Teacher      │
├──────────────┼──────────────┼──────────────┤
│ 07:50-08:30  │ Science      │ Mr. Patel    │ ← Already scheduled
│ 08:30-09:10  │ English      │ Ms. Desai    │
│ 09:10-09:50  │ Hindi        │ Mr. Kumar    │
└──────────────┴──────────────┴──────────────┘

                         ↓
              ADMIN TRIES TO SAVE
                         ↓

CLASS 5 - MONDAY (NEW)
┌──────────────┬──────────────┬──────────────┐
│ Time         │ Subject      │ Teacher      │
├──────────────┼──────────────┼──────────────┤
│ 07:50-08:30  │ Mathematics  │ Mr. Patel    │ ← CLASH! ⚠️
│ 08:30-09:10  │ Science      │ Mrs. Shah    │
│ 09:10-09:50  │ English      │ Ms. Desai    │
└──────────────┴──────────────┴──────────────┘

                         ↓
                    VALIDATION
                         ↓

┌─────────────────────────────────────────────────────────────┐
│  ❌ ERROR: Teacher Clash Detected                           │
├─────────────────────────────────────────────────────────────┤
│  Mr. Patel is already teaching Science in Class 6          │
│  on Monday at 07:50 - 08:30                                │
│                                                              │
│  Cannot assign Mr. Patel to teach Mathematics in Class 5   │
│  at the same time.                                          │
└─────────────────────────────────────────────────────────────┘

REASON: Mr. Patel cannot be in two places at once!
```

---

### Scenario 2: No Clash - Different Time ✅

```
┌─────────────────────────────────────────────────────────────┐
│                    EXISTING SCHEDULES                        │
└─────────────────────────────────────────────────────────────┘

CLASS 6 - MONDAY
┌──────────────┬──────────────┬──────────────┐
│ Time         │ Subject      │ Teacher      │
├──────────────┼──────────────┼──────────────┤
│ 07:50-08:30  │ Science      │ Mr. Patel    │ ← Period 1
│ 08:30-09:10  │ English      │ Ms. Desai    │
│ 09:10-09:50  │ Hindi        │ Mr. Kumar    │
└──────────────┴──────────────┴──────────────┘

                         ↓
              ADMIN TRIES TO SAVE
                         ↓

CLASS 5 - MONDAY (NEW)
┌──────────────┬──────────────┬──────────────┐
│ Time         │ Subject      │ Teacher      │
├──────────────┼──────────────┼──────────────┤
│ 07:50-08:30  │ Computer     │ Mr. Joshi    │
│ 08:30-09:10  │ Mathematics  │ Mr. Patel    │ ← Period 2 ✅
│ 09:10-09:50  │ English      │ Ms. Desai    │
└──────────────┴──────────────┴──────────────┘

                         ↓
                    VALIDATION
                         ↓

┌─────────────────────────────────────────────────────────────┐
│  ✅ SUCCESS: No Clash Detected                              │
├─────────────────────────────────────────────────────────────┤
│  Mr. Patel teaches:                                         │
│  - Class 6 at 07:50-08:30 (Period 1)                       │
│  - Class 5 at 08:30-09:10 (Period 2)                       │
│                                                              │
│  Different time slots - No conflict!                        │
└─────────────────────────────────────────────────────────────┘

REASON: Mr. Patel finishes Class 6 before starting Class 5
```

---

### Scenario 3: No Clash - Different Day ✅

```
┌─────────────────────────────────────────────────────────────┐
│                    EXISTING SCHEDULES                        │
└─────────────────────────────────────────────────────────────┘

CLASS 6 - MONDAY
┌──────────────┬──────────────┬──────────────┐
│ Time         │ Subject      │ Teacher      │
├──────────────┼──────────────┼──────────────┤
│ 07:50-08:30  │ Science      │ Mr. Patel    │ ← Monday
│ 08:30-09:10  │ English      │ Ms. Desai    │
└──────────────┴──────────────┴──────────────┘

                         ↓
              ADMIN TRIES TO SAVE
                         ↓

CLASS 5 - TUESDAY (NEW)
┌──────────────┬──────────────┬──────────────┐
│ Time         │ Subject      │ Teacher      │
├──────────────┼──────────────┼──────────────┤
│ 07:50-08:30  │ Mathematics  │ Mr. Patel    │ ← Tuesday ✅
│ 08:30-09:10  │ Science      │ Mrs. Shah    │
└──────────────┴──────────────┴──────────────┘

                         ↓
                    VALIDATION
                         ↓

┌─────────────────────────────────────────────────────────────┐
│  ✅ SUCCESS: No Clash Detected                              │
├─────────────────────────────────────────────────────────────┤
│  Mr. Patel teaches:                                         │
│  - Class 6 on Monday at 07:50-08:30                        │
│  - Class 5 on Tuesday at 07:50-08:30                       │
│                                                              │
│  Different days - No conflict!                              │
└─────────────────────────────────────────────────────────────┘

REASON: Different days - Mr. Patel is available on Tuesday
```

---

## Weekly Schedule View

### Mr. Patel's Schedule (Valid - No Clashes)

```
┌─────────────────────────────────────────────────────────────┐
│              MR. PATEL'S WEEKLY SCHEDULE                     │
├──────────────┬──────────────┬──────────────┬───────────────┤
│ Time         │ Monday       │ Tuesday      │ Wednesday     │
├──────────────┼──────────────┼──────────────┼───────────────┤
│ 07:50-08:30  │ Class 6      │ Class 5      │ Class 7       │
│              │ Science      │ Mathematics  │ Mathematics   │
├──────────────┼──────────────┼──────────────┼───────────────┤
│ 08:30-09:10  │ Class 5      │ Class 6      │ Class 5       │
│              │ Mathematics  │ Science      │ Science       │
├──────────────┼──────────────┼──────────────┼───────────────┤
│ 09:10-09:50  │ FREE         │ Class 7      │ FREE          │
│              │              │ Science      │               │
├──────────────┼──────────────┼──────────────┼───────────────┤
│ 10:20-11:00  │ Class 7      │ FREE         │ Class 6       │
│              │ Mathematics  │              │ Mathematics   │
└──────────────┴──────────────┴──────────────┴───────────────┘

✅ Valid Schedule - No teacher is in two places at once
```

---

### Mr. Patel's Schedule (Invalid - Has Clash)

```
┌─────────────────────────────────────────────────────────────┐
│              MR. PATEL'S WEEKLY SCHEDULE                     │
├──────────────┬──────────────┬──────────────┬───────────────┤
│ Time         │ Monday       │ Tuesday      │ Wednesday     │
├──────────────┼──────────────┼──────────────┼───────────────┤
│ 07:50-08:30  │ Class 6      │ Class 5      │ Class 7       │
│              │ Science      │ Mathematics  │ Mathematics   │
│              │ +            │              │               │
│              │ Class 5 ⚠️   │              │               │
│              │ Mathematics  │              │               │
├──────────────┼──────────────┼──────────────┼───────────────┤
│ 08:30-09:10  │ Class 5      │ Class 6      │ Class 5       │
│              │ Science      │ Science      │ Science       │
└──────────────┴──────────────┴──────────────┴───────────────┘

❌ CLASH on Monday 07:50-08:30
   Mr. Patel cannot teach both Class 6 and Class 5 simultaneously!
```

---

## Validation Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  CLASH DETECTION PROCESS                     │
└─────────────────────────────────────────────────────────────┘

Admin fills Class 5 timetable
         ↓
┌────────────────────────────────────────┐
│ Monday 07:50-08:30: Mathematics        │
│ Teacher: Mr. Patel                     │
└────────────────────────────────────────┘
         ↓
Admin clicks "Save Timetable"
         ↓
┌────────────────────────────────────────┐
│ System: Get teacher for Mathematics   │
│ Result: Mr. Patel (user_123)          │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│ System: Query existing timetables     │
│ WHERE teacherId = user_123             │
│   AND day = Monday                     │
│   AND time = 07:50-08:30               │
│   AND class != 5                       │
└────────────────────────────────────────┘
         ↓
    ┌─────────┐
    │ Found?  │
    └─────────┘
         ↓
    YES ↓         NO ↓
        ↓             ↓
┌───────────────┐  ┌──────────────┐
│ CLASH!        │  │ NO CLASH     │
│               │  │              │
│ Return Error: │  │ Continue     │
│ "Mr. Patel is │  │ saving...    │
│ already       │  │              │
│ teaching      │  │ ✅ Success   │
│ Science in    │  └──────────────┘
│ Class 6..."   │
│               │
│ ❌ Stop Save  │
└───────────────┘
```

---

## Error Display Examples

### Frontend Error Card

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  Validation Errors                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Teacher clash detected:                                    │
│                                                              │
│  • Mr. Patel is already teaching Science in Class 6        │
│    on Monday at 07:50 - 08:30                              │
│                                                              │
│  • Mrs. Shah is already teaching English in Class 7        │
│    on Tuesday at 08:30 - 09:10                             │
│                                                              │
│  Please adjust the timetable to resolve these conflicts.   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Toast Notification

```
┌─────────────────────────────────────────────────────────────┐
│  ✕ Teacher clash detected: Mr. Patel is already teaching   │
│     Science in Class 6 on Monday at 07:50 - 08:30          │
└─────────────────────────────────────────────────────────────┘
```

---

## Resolution Strategies

### Strategy 1: Change Time Slot

**Before (Clash)**:
```
Class 6: Monday 07:50-08:30 → Science (Mr. Patel)
Class 5: Monday 07:50-08:30 → Mathematics (Mr. Patel) ❌
```

**After (Fixed)**:
```
Class 6: Monday 07:50-08:30 → Science (Mr. Patel)
Class 5: Monday 08:30-09:10 → Mathematics (Mr. Patel) ✅
```

---

### Strategy 2: Change Subject

**Before (Clash)**:
```
Class 6: Monday 07:50-08:30 → Science (Mr. Patel)
Class 5: Monday 07:50-08:30 → Mathematics (Mr. Patel) ❌
```

**After (Fixed)**:
```
Class 6: Monday 07:50-08:30 → Science (Mr. Patel)
Class 5: Monday 07:50-08:30 → Computer (Mr. Joshi) ✅
```

---

### Strategy 3: Change Day

**Before (Clash)**:
```
Class 6: Monday 07:50-08:30 → Science (Mr. Patel)
Class 5: Monday 07:50-08:30 → Mathematics (Mr. Patel) ❌
```

**After (Fixed)**:
```
Class 6: Monday 07:50-08:30 → Science (Mr. Patel)
Class 5: Tuesday 07:50-08:30 → Mathematics (Mr. Patel) ✅
```

---

## Multi-Class Comparison

### All Classes - Monday 07:50-08:30

```
┌─────────────────────────────────────────────────────────────┐
│           MONDAY 07:50-08:30 (PERIOD 1)                     │
├─────────┬──────────────┬──────────────────────────────────┤
│ Class   │ Subject      │ Teacher                          │
├─────────┼──────────────┼──────────────────────────────────┤
│ Class 4 │ English      │ Ms. Desai                        │
│ Class 5 │ Mathematics  │ Mr. Patel                        │
│ Class 6 │ Science      │ Mrs. Shah                        │
│ Class 7 │ Hindi        │ Mr. Kumar                        │
│ Class 8 │ Computer     │ Mr. Joshi                        │
└─────────┴──────────────┴──────────────────────────────────┘

✅ Valid - All different teachers, no clashes
```

---

### All Classes - Monday 07:50-08:30 (With Clash)

```
┌─────────────────────────────────────────────────────────────┐
│           MONDAY 07:50-08:30 (PERIOD 1)                     │
├─────────┬──────────────┬──────────────────────────────────┤
│ Class   │ Subject      │ Teacher                          │
├─────────┼──────────────┼──────────────────────────────────┤
│ Class 4 │ English      │ Ms. Desai                        │
│ Class 5 │ Mathematics  │ Mr. Patel ⚠️                     │
│ Class 6 │ Science      │ Mr. Patel ⚠️                     │
│ Class 7 │ Hindi        │ Mr. Kumar                        │
│ Class 8 │ Computer     │ Mr. Joshi                        │
└─────────┴──────────────┴──────────────────────────────────┘

❌ CLASH - Mr. Patel assigned to both Class 5 and Class 6!
```

---

## Real-World Example

### School Scenario

**Teachers**:
- Mr. Patel: Mathematics & Science
- Mrs. Shah: Science & English
- Ms. Desai: English & Hindi
- Mr. Kumar: Hindi & Gujarati
- Mr. Joshi: Computer

**Monday Schedule**:

```
┌──────────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Time         │ Class 4 │ Class 5 │ Class 6 │ Class 7 │ Class 8 │
├──────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ 07:50-08:30  │ English │ Math    │ Science │ Hindi   │ Computer│
│              │ Desai   │ Patel   │ Shah    │ Kumar   │ Joshi   │
├──────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ 08:30-09:10  │ Math    │ Science │ English │ Math    │ Science │
│              │ Patel   │ Shah    │ Desai   │ Patel   │ Shah    │
├──────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ 09:10-09:50  │ Hindi   │ English │ Math    │ Science │ English │
│              │ Kumar   │ Desai   │ Patel   │ Shah    │ Desai   │
└──────────────┴─────────┴─────────┴─────────┴─────────┴─────────┘

✅ Valid Schedule - No teacher appears twice in same time slot
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  CLASH PREVENTION SYSTEM                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Frontend (Smart Timetable)          │
│  ─────────────────────────────────   │
│  • Admin fills timetable grid        │
│  • Clicks "Save Timetable"           │
│  • Sends data to backend             │
└──────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│  Backend API                         │
│  ─────────────────────────────────   │
│  POST /timetable/smart/save          │
│                                      │
│  Validations:                        │
│  1. ✓ All slots filled               │
│  2. ✓ Subject repetition (max 2)    │
│  3. ✓ Teacher clash check (NEW)     │
└──────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│  Database Queries                    │
│  ─────────────────────────────────   │
│  • Get teacher for each subject      │
│  • Query existing timetables         │
│  • Compare schedules                 │
│  • Detect conflicts                  │
└──────────────────────────────────────┘
                 ↓
         ┌───────────────┐
         │ Clash Found?  │
         └───────────────┘
                 ↓
        YES ↓         NO ↓
            ↓             ↓
┌──────────────────┐  ┌──────────────────┐
│ Return Error     │  │ Save Timetable   │
│ Status: 409      │  │ Status: 201      │
│ Message: Details │  │ Message: Success │
└──────────────────┘  └──────────────────┘
            ↓             ↓
┌──────────────────┐  ┌──────────────────┐
│ Frontend Shows   │  │ Frontend Shows   │
│ Error Card       │  │ Success Toast    │
│ ❌ Clash Details │  │ ✅ Saved!        │
└──────────────────┘  └──────────────────┘
```

---

## Benefits Visualization

```
┌─────────────────────────────────────────────────────────────┐
│                    BEFORE vs AFTER                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  BEFORE (No Clash Detection)                                │
│  ───────────────────────────                                │
│  ❌ Teachers double-booked                                  │
│  ❌ Impossible schedules created                            │
│  ❌ Manual checking required                                │
│  ❌ Errors discovered too late                              │
│  ❌ Confusion and conflicts                                 │
│                                                              │
│  AFTER (With Clash Detection)                               │
│  ──────────────────────────────                             │
│  ✅ Automatic validation                                    │
│  ✅ Prevents impossible schedules                           │
│  ✅ Real-time error detection                               │
│  ✅ Clear error messages                                    │
│  ✅ Reliable scheduling                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```
