# Auto-Assign Teacher from Subject Feature

## Overview
When a subject is selected in the timetable creation form, the system automatically fetches and assigns the teacher who is responsible for that subject in the selected class.

## Implementation Details

### Backend Changes

#### 1. New API Endpoint: `/subjects/teacher-by-subject`
- **Method**: GET
- **Query Parameters**:
  - `class`: Class number (4-8)
  - `subject`: Subject name
- **Response**:
  ```json
  {
    "teacherId": "user_id_here",
    "teacherName": "Mr. Patel"
  }
  ```
- **Location**: `backend/src/routes/classSubjectsRoutes.ts`

#### 2. Updated Timetable Routes
- **Helper Function**: `getTeacherForSubject(classNum, subject)`
  - Automatically fetches teacher information from ClassSubjects collection
  - Returns teacherId and teacherName
- **Modified Endpoints**:
  - `POST /timetable` - Auto-assigns teacher when creating regular timetable
  - `POST /timetable/exam` - Auto-assigns teacher when creating exam timetable
- **Location**: `backend/src/routes/timetableRoutes.ts`

### Frontend Changes

#### AdminTimetable Component
- **New Function**: `handleSubjectChange`
  - Triggers when subject dropdown changes
  - Calls `/subjects/teacher-by-subject` API
  - Auto-fills teacher name field
- **UI Updates**:
  - Teacher name field is now **read-only** (cannot be manually edited)
  - Label changed to "Teacher Name (auto-filled)"
  - Placeholder text: "Auto-assigned from subject"
  - Visual styling: Grayed out background to indicate read-only state
- **Location**: `frontend/src/pages/admin/AdminTimetable.tsx`

## How It Works

### User Flow
1. Admin opens "Add Timetable Entry" modal
2. Selects **Class** (e.g., "Class 5")
3. Selects **Subject** (e.g., "Mathematics")
4. System automatically:
   - Queries the ClassSubjects collection for Class 5
   - Finds the teacher assigned to "Mathematics"
   - Auto-fills the "Teacher Name" field with the teacher's name
5. Teacher field is **read-only** - no manual override allowed
6. Admin completes other fields (Day, Time) and saves

### Data Mapping
```
ClassSubjects Collection:
{
  class: 5,
  subjects: [
    { name: "Mathematics", teacherId: "user_123" },
    { name: "Science", teacherId: "user_456" }
  ]
}

User Collection:
{
  _id: "user_123",
  name: "Mr. Patel",
  role: "teacher"
}

Result:
Subject: Mathematics → Teacher: Mr. Patel (auto-filled)
```

## Benefits
- **Consistency**: Ensures correct teacher is always assigned to their subject
- **Efficiency**: Eliminates manual teacher selection
- **Data Integrity**: Prevents mismatched teacher-subject assignments
- **Single Source of Truth**: Teacher assignments managed in ClassSubjects

## Configuration
To assign teachers to subjects, use the **Admin Class Subjects** page:
1. Navigate to Admin → Class Subjects
2. Select a class
3. Assign teachers to each subject
4. These assignments will be used for auto-filling in timetable creation
