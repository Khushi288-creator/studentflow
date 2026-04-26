# Auto-Generated Timetable Periods with Prayer and Break

## Overview
The system automatically generates school period schedules based on school timing configuration. The schedule includes a fixed prayer time at the start, teaching periods, and a break after a specified number of periods.

## Structure

### Period Types
1. **Prayer** - Fixed at the start of the school day (non-editable)
2. **Period** - Teaching periods where subjects are assigned
3. **Break** - Fixed break time after specified periods (highlighted)

### Example Schedule
**School Timing**: 7:20 AM - 12:20 PM  
**Prayer Duration**: 30 minutes  
**Break Duration**: 30 minutes  
**Break After**: Period 3

```
🤲 Prayer:    7:20 - 7:50  (30 min) [Fixed, Non-editable]
📚 Period 1:  7:50 - 8:30  (40 min)
📚 Period 2:  8:30 - 9:10  (40 min)
📚 Period 3:  9:10 - 9:50  (40 min)
☕ Break:     9:50 - 10:20 (30 min) [Fixed, Highlighted]
📚 Period 4:  10:20 - 11:00 (40 min)
📚 Period 5:  11:00 - 11:40 (40 min)
📚 Period 6:  11:40 - 12:20 (40 min)
```

## Implementation Details

### Backend Changes

#### 1. Updated SchoolConfig Model
**File**: `backend/src/models/SchoolConfig.ts`

**New Fields**:
- `prayerDuration`: number (minutes, default: 30)
- `breakAfterPeriod`: number (default: 3)

**Period Structure**:
```typescript
{
  type: 'prayer' | 'period' | 'break',
  label: string,
  startTime: string,
  endTime: string,
  periodNumber?: number  // Only for type='period'
}
```

#### 2. Auto-Generation Algorithm
**File**: `backend/src/routes/schoolConfigRoutes.ts`

**Function**: `calculatePeriods()`

**Logic**:
1. Calculate total school time (end - start)
2. Subtract prayer and break durations to get net teaching time
3. Divide net time by 40 minutes to determine period count (4-8 periods)
4. Calculate exact period duration
5. Generate schedule:
   - Prayer slot (fixed at start)
   - Periods before break
   - Break slot (after specified period)
   - Remaining periods

**Calculation**:
```javascript
totalMinutes = endTime - startTime
netMinutes = totalMinutes - prayerDuration - breakDuration
periodCount = floor(netMinutes / 40)  // 40-min target per period
periodDuration = floor(netMinutes / periodCount)
```

#### 3. API Endpoints

**GET /school-config**
- Returns current school configuration with auto-generated periods
- Available to all authenticated users

**PUT /school-config**
- Updates school timing configuration
- Admin only
- Automatically regenerates period schedule
- Request body:
```json
{
  "startTime": "07:20",
  "endTime": "12:20",
  "prayerDuration": 30,
  "breakDuration": 30,
  "breakAfterPeriod": 3
}
```

### Frontend Changes

#### AdminSchoolConfig Component
**File**: `frontend/src/pages/admin/AdminSchoolConfig.tsx`

**Features**:
1. **Configuration Form**:
   - Start Time (time picker)
   - End Time (time picker)
   - Prayer Duration (number input, 0-60 minutes)
   - Break Duration (number input, 0-60 minutes)
   - Break After Period (number input, 1-8)

2. **Summary Stats**:
   - Total School Time
   - Prayer Duration
   - Break Duration
   - Net Teaching Time
   - Total Periods
   - Period Duration

3. **Period Schedule Table**:
   - Auto-generated from configuration
   - Visual indicators:
     - 🤲 Purple badge for Prayer
     - ☕ Amber badge for Break
     - 📚 Indigo badge for Periods
   - Shows: #, Period, Start, End, Duration
   - Prayer row: Purple background (non-editable)
   - Break row: Amber background (highlighted)

## Rules and Constraints

### 1. Prayer Time
- **Always fixed at the start** of the school day
- Duration configurable (default: 30 minutes)
- Non-editable in timetable assignment
- Cannot be removed or moved

### 2. Break Time
- **Always placed after specified period** (default: after Period 3)
- Duration configurable (default: 30 minutes)
- Highlighted in UI
- Non-editable in timetable assignment

### 3. Teaching Periods
- **Auto-calculated** based on available time
- Minimum: 4 periods
- Maximum: 8 periods
- Target duration: 40 minutes per period
- Admin assigns subjects only to periods (not prayer/break)

### 4. Time Validation
- End time must be after start time
- Minimum school day: prayer + break + 1 period (≈100 minutes)
- All times in 24-hour format (HH:MM)

### 5. Auto-Adjustment
- Period count adjusts automatically based on available time
- Period duration distributes evenly across teaching time
- No manual time input needed for individual periods

## Usage Flow

### Admin Configuration
1. Navigate to **Admin → School Timing**
2. Set school start and end times
3. Configure prayer duration (fixed at start)
4. Configure break duration
5. Set break position (after which period)
6. Click **Save Configuration**
7. System automatically generates complete schedule

### Period Schedule Display
- Shows complete day structure
- Prayer row (purple, non-editable)
- Teaching periods (blue, subject assignable)
- Break row (amber, highlighted)
- All times auto-calculated

### Timetable Assignment
- Admin assigns subjects only to teaching periods
- Prayer and break slots are fixed and non-editable
- Teacher auto-assigned based on subject (from previous feature)

## Data Storage (MongoDB)

### SchoolConfig Collection
```javascript
{
  key: "default",
  startTime: "07:20",
  endTime: "12:20",
  prayerDuration: 30,
  breakDuration: 30,
  breakAfterPeriod: 3,
  totalMinutes: 300,
  netMinutes: 240,
  periodCount: 6,
  periodDuration: 40,
  periods: [
    {
      type: "prayer",
      label: "Prayer",
      startTime: "07:20",
      endTime: "07:50"
    },
    {
      type: "period",
      label: "Period 1",
      startTime: "07:50",
      endTime: "08:30",
      periodNumber: 1
    },
    // ... more periods
    {
      type: "break",
      label: "Break",
      startTime: "09:50",
      endTime: "10:20"
    },
    // ... remaining periods
  ]
}
```

## Benefits

1. **Zero Manual Time Entry**: All period times auto-calculated
2. **Consistency**: Same structure across all classes
3. **Flexibility**: Easy to adjust school timing
4. **Religious Accommodation**: Fixed prayer time at start
5. **Student Welfare**: Guaranteed break after specified periods
6. **Scalability**: Automatically adjusts to different school hours
7. **Error Prevention**: No manual time conflicts possible

## Example Scenarios

### Scenario 1: Standard School Day
- **Timing**: 7:20 AM - 12:20 PM (5 hours)
- **Prayer**: 30 minutes
- **Break**: 30 minutes after Period 3
- **Result**: 6 periods × 40 minutes each

### Scenario 2: Extended School Day
- **Timing**: 7:00 AM - 2:00 PM (7 hours)
- **Prayer**: 30 minutes
- **Break**: 30 minutes after Period 4
- **Result**: 8 periods × 45 minutes each

### Scenario 3: Half Day
- **Timing**: 8:00 AM - 11:30 AM (3.5 hours)
- **Prayer**: 20 minutes
- **Break**: 20 minutes after Period 2
- **Result**: 4 periods × 35 minutes each

## Integration with Timetable

The auto-generated periods integrate with the timetable system:
- Admin views period structure in School Config
- When creating timetable entries, only teaching periods are assignable
- Prayer and break are automatically included in daily schedule
- Subject-teacher auto-assignment works for teaching periods only

## Future Enhancements

Possible future improvements:
- Multiple break times for longer school days
- Different schedules for different days (e.g., Friday early dismissal)
- Custom period durations (not all equal)
- Assembly time slot option
- Lunch period separate from break
