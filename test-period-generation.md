# Testing Period Generation Feature

## Manual Testing Steps

### 1. Test School Config API

#### Get Current Config
```bash
# GET /school-config
curl -X GET http://localhost:5000/school-config \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response**:
```json
{
  "config": {
    "startTime": "07:20",
    "endTime": "12:20",
    "prayerDuration": 30,
    "breakDuration": 30,
    "breakAfterPeriod": 3,
    "totalMinutes": 300,
    "netMinutes": 240,
    "periodCount": 6,
    "periodDuration": 40,
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
      },
      {
        "type": "period",
        "label": "Period 2",
        "startTime": "08:30",
        "endTime": "09:10",
        "periodNumber": 2
      },
      {
        "type": "period",
        "label": "Period 3",
        "startTime": "09:10",
        "endTime": "09:50",
        "periodNumber": 3
      },
      {
        "type": "break",
        "label": "Break",
        "startTime": "09:50",
        "endTime": "10:20"
      },
      {
        "type": "period",
        "label": "Period 4",
        "startTime": "10:20",
        "endTime": "11:00",
        "periodNumber": 4
      },
      {
        "type": "period",
        "label": "Period 5",
        "startTime": "11:00",
        "endTime": "11:40",
        "periodNumber": 5
      },
      {
        "type": "period",
        "label": "Period 6",
        "startTime": "11:40",
        "endTime": "12:20",
        "periodNumber": 6
      }
    ]
  }
}
```

#### Update Config
```bash
# PUT /school-config (Admin only)
curl -X PUT http://localhost:5000/school-config \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "08:00",
    "endTime": "13:00",
    "prayerDuration": 25,
    "breakDuration": 35,
    "breakAfterPeriod": 3
  }'
```

**Expected Response**:
```json
{
  "config": { /* updated config with recalculated periods */ },
  "message": "School timing updated successfully"
}
```

### 2. Test Frontend UI

#### Access School Config Page
1. Login as Admin
2. Navigate to: **Admin → School Timing**
3. Verify form shows:
   - Start Time input
   - End Time input
   - Prayer Duration input (with helper text)
   - Break Duration input
   - Break After Period input (with helper text)

#### Verify Summary Stats
Check that summary card displays:
- Total School Time
- Prayer Duration
- Break Duration
- Net Teaching Time
- Total Periods
- Period Duration

#### Verify Period Schedule Table
Check that table shows:
- Prayer row (purple badge 🤲, purple background)
- Period rows (blue badge 📚)
- Break row (amber badge ☕, amber background)
- Correct start/end times
- Correct durations

#### Test Configuration Update
1. Change start time to 08:00
2. Change end time to 13:00
3. Change prayer duration to 25
4. Change break duration to 35
5. Change break after period to 4
6. Click "Save Configuration"
7. Verify success toast appears
8. Verify period schedule updates automatically
9. Verify calculations are correct

### 3. Validation Tests

#### Test Invalid Configurations

**Test 1: End time before start time**
```json
{
  "startTime": "12:00",
  "endTime": "08:00",
  "prayerDuration": 30,
  "breakDuration": 30,
  "breakAfterPeriod": 3
}
```
Expected: Error "End time must be after start time"

**Test 2: School day too short**
```json
{
  "startTime": "08:00",
  "endTime": "08:30",
  "prayerDuration": 30,
  "breakDuration": 30,
  "breakAfterPeriod": 3
}
```
Expected: Error "School day too short for prayer, break, and at least one period"

**Test 3: Invalid time format**
```json
{
  "startTime": "7:20",
  "endTime": "12:20",
  "prayerDuration": 30,
  "breakDuration": 30,
  "breakAfterPeriod": 3
}
```
Expected: Error "Format must be HH:MM"

### 4. Calculation Verification

#### Verify Period Count Logic
Test different school durations:

| Start | End   | Prayer | Break | Net Time | Expected Periods | Period Duration |
|-------|-------|--------|-------|----------|------------------|-----------------|
| 07:20 | 12:20 | 30     | 30    | 240 min  | 6 periods        | 40 min          |
| 08:00 | 13:00 | 30     | 30    | 240 min  | 6 periods        | 40 min          |
| 07:00 | 14:00 | 30     | 30    | 360 min  | 8 periods        | 45 min          |
| 08:00 | 11:00 | 20     | 20    | 140 min  | 4 periods        | 35 min          |

#### Verify Break Placement
- Break should always appear after specified period number
- If breakAfterPeriod = 3, break comes after Period 3
- If breakAfterPeriod = 4, break comes after Period 4

#### Verify Time Continuity
- Each period's end time = next period's start time
- No gaps or overlaps
- Last period's end time = school end time

### 5. Integration Tests

#### Test with Timetable Creation
1. Configure school timing
2. Navigate to Timetable page
3. Create new timetable entry
4. Verify only teaching periods are assignable
5. Verify prayer and break are not selectable

#### Test with Multiple Classes
1. Configure school timing
2. Create timetables for different classes
3. Verify all use same period structure
4. Verify consistency across classes

## Expected Behavior Summary

✅ **Prayer**:
- Always first slot
- Fixed duration
- Non-editable
- Purple badge and background

✅ **Periods**:
- Auto-calculated count (4-8)
- Equal duration
- Subject assignable
- Blue badge

✅ **Break**:
- After specified period
- Fixed duration
- Non-editable
- Amber badge and background

✅ **Calculations**:
- All times auto-generated
- No manual input needed
- Adjusts to school hours
- Validates constraints

✅ **UI**:
- Clear visual distinction
- Real-time updates
- Helpful tooltips
- Error messages
