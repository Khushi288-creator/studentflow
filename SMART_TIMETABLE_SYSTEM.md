# Smart Timetable System

## Overview
The Smart Timetable System allows admins to build complete class timetables using pre-generated time slots from school configuration. The system automatically assigns teachers based on subject selection and validates the timetable before saving.

## Key Features

### 1. Pre-Generated Time Slots ✅
- Uses periods from School Config (prayer and break excluded)
- Shows only teaching periods
- Displays time ranges for each period
- Consistent across all classes

### 2. Subject Assignment ✅
- Admin selects subject for each period slot
- Dropdown shows available subjects for the class
- Visual feedback for empty slots
- Real-time validation

### 3. Auto Teacher Assignment ✅
- Teacher automatically assigned based on subject
- Uses ClassSubjects mapping
- No manual teacher selection needed
- Consistent with subject-teacher assignments

### 4. Validation Rules ✅
- **No Empty Slots**: All periods must be filled
- **Subject Repetition Limit**: Max 2 occurrences per day
- **Real-time Feedback**: Visual indicators for violations
- **Pre-save Validation**: Prevents saving invalid timetables

### 5. Class-wise Saving ✅
- Complete timetable saved per class
- Replaces existing timetable
- Atomic operation (all or nothing)
- Notifies students after save

## Implementation Details

### Backend API Endpoints

#### 1. GET /timetable/smart/periods
**Purpose**: Fetch pre-generated teaching periods

**Access**: Admin only

**Response**:
```json
{
  "periods": [
    {
      "periodNumber": 1,
      "label": "Period 1",
      "startTime": "07:50",
      "endTime": "08:30",
      "timeSlot": "07:50 - 08:30"
    }
  ],
  "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
}
```

**Notes**:
- Filters out prayer and break periods
- Only returns teaching periods
- Uses school config data

#### 2. GET /timetable/smart/class/:class
**Purpose**: Fetch existing timetable for a class

**Access**: Admin only

**Parameters**:
- `class`: Class number (4-8)

**Response**:
```json
{
  "timetable": {
    "Monday": {
      "07:50 - 08:30": {
        "id": "entry_id",
        "subject": "Mathematics",
        "teacherId": "user_123",
        "teacherName": "Mr. Patel"
      }
    }
  }
}
```

**Notes**:
- Groups entries by day and time slot
- Used to load existing timetable for editing

#### 3. POST /timetable/smart/save
**Purpose**: Save complete timetable for a class

**Access**: Admin only

**Request Body**:
```json
{
  "class": "5",
  "timetable": [
    {
      "day": "Monday",
      "periodNumber": 1,
      "timeSlot": "07:50 - 08:30",
      "subject": "Mathematics"
    }
  ]
}
```

**Validations**:
1. **Complete Timetable**: Must have entries for all periods × all days
2. **Subject Repetition**: Max 2 occurrences per subject per day

**Response**:
```json
{
  "message": "Timetable saved successfully for Class 5",
  "entriesCreated": 36
}
```

**Process**:
1. Validate completeness (all slots filled)
2. Validate subject repetition (max 2 per day)
3. Delete existing timetable for class
4. Create new entries with auto-assigned teachers
5. Notify students

### Frontend Component

#### AdminSmartTimetable.tsx

**Location**: `frontend/src/pages/admin/AdminSmartTimetable.tsx`

**Features**:

1. **Class Selector**
   - Buttons for classes 4-8
   - Highlights selected class
   - Shows validation rules

2. **Timetable Grid**
   - Rows: Days (Monday-Saturday)
   - Columns: Periods (from school config)
   - Cells: Subject dropdowns

3. **Visual Indicators**
   - Empty slots: Red border, rose background
   - Valid slots: Normal styling
   - Over-limit subjects: Red border, warning icon
   - Subject count: Shows "2x today" if repeated

4. **Validation Display**
   - Real-time validation as user fills slots
   - Error card at top showing all issues
   - Inline warnings for repeated subjects
   - Pre-save validation check

5. **Actions**
   - **Clear All**: Reset entire timetable
   - **Save Timetable**: Validate and save

6. **Info Panel**
   - Periods per day count
   - School days count
   - Available subjects count

### Data Flow

```
1. Admin selects class
   ↓
2. System loads:
   - Pre-generated periods (from school config)
   - Available subjects (from class subjects)
   - Existing timetable (if any)
   ↓
3. Admin fills grid with subjects
   ↓
4. System validates in real-time:
   - Highlights empty slots
   - Warns about repetition
   ↓
5. Admin clicks Save
   ↓
6. System validates:
   - All slots filled?
   - Subject repetition within limit?
   ↓
7. If valid:
   - Delete old timetable
   - Create new entries
   - Auto-assign teachers
   - Notify students
   ↓
8. Success message shown
```

## Validation Rules

### Rule 1: No Empty Slots
**Description**: All period slots for all days must be filled

**Check**: Count of filled slots = (periods × days)

**Error Message**: 
```
"X empty slot(s) found. Please fill all slots before saving."
```

**Visual Indicator**:
- Empty dropdowns have red border
- Rose background color
- Placeholder text: "Select subject..."

### Rule 2: Subject Repetition Limit
**Description**: Same subject can appear max 2 times per day

**Check**: Count occurrences of each subject per day

**Error Message**:
```
"Mathematics appears 3 times on Monday. Maximum 2 per day."
```

**Visual Indicator**:
- Dropdown has red border when over limit
- Shows "3x today ⚠️" below dropdown
- Warning icon displayed

## Usage Guide

### Step 1: Configure Prerequisites
Before using Smart Timetable:

1. **Configure School Timing**
   - Navigate to: Admin → School Timing
   - Set start/end times, prayer, break
   - System generates teaching periods

2. **Assign Teachers to Subjects**
   - Navigate to: Admin → Class Subjects
   - For each class, assign teachers to subjects
   - This enables auto-assignment

### Step 2: Build Timetable

1. **Navigate to Smart Timetable**
   - Go to: Admin → Smart Timetable

2. **Select Class**
   - Click on class button (4-8)
   - Grid loads with periods and days

3. **Fill Timetable**
   - For each day and period:
     - Select subject from dropdown
     - Teacher auto-assigned (not shown in grid)
   - Watch for validation warnings

4. **Review Validation**
   - Check for empty slots (red borders)
   - Check for over-repeated subjects (warnings)
   - Fix any issues

5. **Save Timetable**
   - Click "Save Timetable" button
   - System validates completely
   - If valid: Saves and shows success
   - If invalid: Shows error messages

### Step 3: Verify
- Students can view timetable in their dashboard
- Teachers see their assigned periods
- Admin can edit by returning to Smart Timetable

## Example Timetable

**Class 5 - Monday**

| Period | Time | Subject | Teacher (Auto) |
|--------|------|---------|----------------|
| Period 1 | 07:50-08:30 | Mathematics | Mr. Patel |
| Period 2 | 08:30-09:10 | Science | Mrs. Shah |
| Period 3 | 09:10-09:50 | English | Ms. Desai |
| Period 4 | 10:20-11:00 | Mathematics | Mr. Patel |
| Period 5 | 11:00-11:40 | Hindi | Mr. Kumar |
| Period 6 | 11:40-12:20 | Computer | Mr. Joshi |

**Validation**:
- ✅ All 6 slots filled
- ✅ Mathematics appears 2 times (within limit)
- ✅ All other subjects appear once

## Benefits

### 1. Efficiency
- Build complete weekly timetable in one session
- No need to create individual entries
- Pre-filled with existing data for editing

### 2. Consistency
- Uses school-configured periods
- Same structure for all classes
- Teacher assignments consistent with subject mapping

### 3. Error Prevention
- Real-time validation prevents mistakes
- Cannot save incomplete timetable
- Subject repetition controlled

### 4. User Experience
- Visual grid interface (like spreadsheet)
- Clear validation feedback
- Intuitive workflow

### 5. Automation
- Teachers auto-assigned
- No manual teacher selection
- Reduces admin workload

## Technical Details

### Database Operations

**Save Operation**:
```javascript
1. BEGIN TRANSACTION
2. DELETE FROM timetable WHERE class = X AND type = 'regular'
3. FOR EACH slot IN timetable:
     - Fetch teacher for subject
     - INSERT INTO timetable (class, day, subject, time, teacherId, teacherName)
4. FOR EACH student IN class:
     - INSERT INTO notice (notification)
5. COMMIT TRANSACTION
```

**Atomic**: Either all entries saved or none (rollback on error)

### Performance Considerations

**Optimization**:
- Single API call to save entire timetable
- Batch delete before insert
- Teacher lookup cached per subject
- Minimal database queries

**Expected Load**:
- 6 periods × 6 days = 36 entries per class
- 5 classes × 36 entries = 180 total entries
- Save time: < 2 seconds

### Error Handling

**Frontend Errors**:
- Empty slots: Highlighted in UI
- Repetition: Warning shown
- Network error: Toast notification

**Backend Errors**:
- Validation failed: Detailed error message
- Database error: Generic error message
- Teacher not found: Saves without teacher (null)

## Comparison: Old vs New System

### Old System (Individual Entry)
- ❌ Create one entry at a time
- ❌ Manual time selection
- ❌ Manual teacher selection
- ❌ No validation until save
- ❌ Time-consuming for full week
- ❌ Easy to miss slots
- ❌ Inconsistent structure

### New System (Smart Timetable)
- ✅ Build entire week at once
- ✅ Pre-generated time slots
- ✅ Auto teacher assignment
- ✅ Real-time validation
- ✅ Quick full-week setup
- ✅ Visual grid shows all slots
- ✅ Consistent structure

## Future Enhancements

Possible improvements:
- **Copy from Another Class**: Duplicate timetable structure
- **Template System**: Save and reuse timetable templates
- **Bulk Edit**: Change subject across multiple days
- **Teacher Availability**: Check teacher conflicts
- **Subject Distribution**: Auto-suggest balanced distribution
- **Export/Import**: CSV or Excel format
- **Undo/Redo**: Revert changes before save
- **Draft Mode**: Save incomplete timetable as draft

## Troubleshooting

### Issue: Periods not showing
**Solution**: Configure school timing in School Config first

### Issue: No subjects in dropdown
**Solution**: Add subjects for the class in Class Subjects page

### Issue: Teacher not auto-assigned
**Solution**: Assign teacher to subject in Class Subjects page

### Issue: Cannot save - validation errors
**Solution**: 
1. Fill all empty slots (red borders)
2. Reduce repeated subjects to max 2 per day
3. Check error messages at top

### Issue: Timetable not loading
**Solution**: 
1. Check if school config exists
2. Verify class has subjects configured
3. Check browser console for errors

## API Testing

### Test 1: Get Periods
```bash
curl -X GET http://localhost:5000/timetable/smart/periods \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Test 2: Get Existing Timetable
```bash
curl -X GET http://localhost:5000/timetable/smart/class/5 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Test 3: Save Timetable
```bash
curl -X POST http://localhost:5000/timetable/smart/save \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "class": "5",
    "timetable": [
      {
        "day": "Monday",
        "periodNumber": 1,
        "timeSlot": "07:50 - 08:30",
        "subject": "Mathematics"
      }
    ]
  }'
```

## Security

- All endpoints require authentication
- Admin role required for all operations
- Input validation on backend
- SQL injection prevention (Prisma ORM)
- XSS prevention (React escaping)

## Accessibility

- Keyboard navigation supported
- Screen reader friendly labels
- High contrast colors for validation
- Clear error messages
- Semantic HTML structure
