# Quick Reference Card

## 🚀 Quick Start

### 1. Configure School Timing (Admin)
```
Navigate: Admin → School Timing
Set: Start Time, End Time, Prayer Duration, Break Duration, Break Position
Click: Save Configuration
Result: Period schedule auto-generated
```

### 2. Assign Teachers to Subjects (Admin)
```
Navigate: Admin → Class Subjects
Select: Class
Assign: Teacher to each subject
Result: Teacher-subject mapping created
```

### 3. Create Timetable (Admin)
```
Navigate: Admin → Timetable
Click: + Add Entry
Select: Class, Day, Subject
Result: Teacher auto-filled, time slots available
```

## 📋 Period Types

| Type | Icon | Color | Editable | Purpose |
|------|------|-------|----------|---------|
| Prayer | 🤲 | Purple | No | Fixed at start |
| Period | 📚 | Blue | Yes | Teaching time |
| Break | ☕ | Amber | No | Fixed after periods |

## 🔧 Configuration Options

| Setting | Type | Range | Default | Description |
|---------|------|-------|---------|-------------|
| Start Time | Time | HH:MM | 07:20 | School start |
| End Time | Time | HH:MM | 12:20 | School end |
| Prayer Duration | Number | 0-60 min | 30 | Fixed at start |
| Break Duration | Number | 0-60 min | 30 | Mid-day break |
| Break After Period | Number | 1-8 | 3 | Break position |

## 📊 Auto-Calculations

```
Total Time = End Time - Start Time
Net Teaching Time = Total - Prayer - Break
Period Count = Net Time ÷ 40 minutes (approx)
Period Duration = Net Time ÷ Period Count
```

## 🔗 API Endpoints

### School Config
```
GET  /school-config              # Get configuration
PUT  /school-config              # Update configuration (admin)
```

### Teacher Assignment
```
GET  /subjects/teacher-by-subject?class=5&subject=Math
```

### Timetable
```
GET  /timetable?type=regular&class=5
POST /timetable                  # Create entry (auto-assigns teacher)
POST /timetable/exam             # Create exam entry
PUT  /timetable/:id              # Update entry
DELETE /timetable/:id            # Delete entry
```

## 💾 Data Structure

### SchoolConfig
```json
{
  "startTime": "07:20",
  "endTime": "12:20",
  "prayerDuration": 30,
  "breakDuration": 30,
  "breakAfterPeriod": 3,
  "periods": [
    {
      "type": "prayer",
      "label": "Prayer",
      "startTime": "07:20",
      "endTime": "07:50"
    },
    {
      "type": "period",
      "label": "Period 1",
      "startTime": "07:50",
      "endTime": "08:30",
      "periodNumber": 1
    }
  ]
}
```

### ClassSubjects
```json
{
  "class": 5,
  "subjects": [
    {
      "name": "Mathematics",
      "teacherId": "user_123"
    }
  ]
}
```

## ⚠️ Validation Rules

| Rule | Error Message |
|------|---------------|
| End > Start | "End time must be after start time" |
| Min Duration | "School day too short for prayer, break, and at least one period" |
| Time Format | "Format must be HH:MM" |
| Duration Range | "Duration must be between 0 and 60" |
| Period Position | "Break position must be between 1 and 8" |

## 🎨 UI Elements

### School Config Page
- **Left Panel**: Configuration form
- **Right Top**: Period schedule table
- **Right Bottom**: Summary statistics

### Timetable Page
- **Top**: Type tabs (Regular/Exam)
- **Left**: Class selector
- **Right**: Timetable entries table
- **Modal**: Add/Edit entry form

## 🔄 Workflow

```
1. Admin sets school timing
   ↓
2. System generates periods
   ↓
3. Admin assigns teachers to subjects
   ↓
4. Admin creates timetable entries
   ↓
5. System auto-assigns teachers
   ↓
6. Students/Teachers view schedule
```

## 📱 User Roles

| Role | Can View | Can Edit |
|------|----------|----------|
| Admin | All | School Config, Subjects, Timetable |
| Teacher | Own schedule | Nothing |
| Student | Own class | Nothing |
| Parent | Child's class | Nothing |

## 🎯 Key Features

✅ **Zero Manual Time Entry** - All times auto-calculated  
✅ **Prayer Time** - Fixed at start, configurable duration  
✅ **Break Time** - Fixed position, configurable duration  
✅ **Auto Teacher Assignment** - Based on subject mapping  
✅ **Consistent Schedules** - Same structure for all classes  
✅ **Error Prevention** - No time conflicts possible  
✅ **Flexible Configuration** - Easy to adjust timing  

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Periods not showing | Save school config first |
| Teacher not auto-filling | Assign teacher to subject in Class Subjects |
| Invalid time error | Use HH:MM format (e.g., 07:20) |
| Too few periods | Increase school duration or reduce break time |
| Break in wrong position | Change "Break After Period" setting |

## 📞 Common Tasks

### Change School Hours
```
1. Go to School Timing page
2. Update Start/End times
3. Click Save
4. Periods regenerate automatically
```

### Add New Subject
```
1. Go to Class Subjects page
2. Select class
3. Click Add Subject
4. Enter name and assign teacher
5. Subject now available in timetable
```

### Create Weekly Timetable
```
1. Go to Timetable page
2. Select class
3. For each day:
   - Click Add Entry
   - Select day and subject
   - Teacher auto-fills
   - Set time
   - Save
```

## 📈 Example Scenarios

### Standard Day (5 hours)
- **Time**: 07:20 - 12:20
- **Prayer**: 30 min
- **Break**: 30 min
- **Result**: 6 periods × 40 min

### Extended Day (7 hours)
- **Time**: 07:00 - 14:00
- **Prayer**: 30 min
- **Break**: 30 min
- **Result**: 8 periods × 45 min

### Half Day (3.5 hours)
- **Time**: 08:00 - 11:30
- **Prayer**: 20 min
- **Break**: 20 min
- **Result**: 4 periods × 35 min

## 🔐 Security

- All endpoints require authentication
- School config update: Admin only
- Timetable creation: Admin only
- View permissions: Role-based

## 📚 Documentation Files

- `AUTO_ASSIGN_TEACHER_FEATURE.md` - Teacher assignment details
- `TIMETABLE_PERIOD_GENERATION.md` - Period generation guide
- `IMPLEMENTATION_SUMMARY.md` - Complete implementation overview
- `VISUAL_GUIDE.md` - Visual diagrams and UI mockups
- `test-period-generation.md` - Testing procedures
- `QUICK_REFERENCE.md` - This file

## 💡 Tips

1. **Configure school timing first** before creating timetables
2. **Assign all teachers to subjects** for auto-assignment to work
3. **Use consistent subject names** across classes
4. **Review generated schedule** after changing timing
5. **Test with one class** before rolling out to all
6. **Keep prayer/break durations reasonable** (20-40 minutes)
7. **Place break after 3-4 periods** for optimal student focus

## 🎓 Best Practices

- Set prayer duration based on school policy
- Place break in middle of school day
- Aim for 40-minute periods (optimal learning time)
- Keep total school day between 4-7 hours
- Review and adjust timing at start of each term
- Ensure all subjects have assigned teachers
- Create timetables for all days of the week
- Communicate schedule changes to all stakeholders
