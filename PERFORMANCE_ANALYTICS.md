# 📊 Performance Analytics Dashboard

Enhanced teacher dashboard with comprehensive performance analytics and interactive charts.

## 🎯 Features

### 1. **Quick Stats Card**
- Total students count
- Average attendance percentage (last 30 days)
- Assignments graded count
- Class average performance
- Top performer highlight
- Students needing attention alert

### 2. **Enhanced Performance Analytics**
Interactive tabbed interface with multiple chart views:

#### 📈 Overview Tab
- **Marks Trend**: Line chart showing 4-week performance trend
- **Attendance Distribution**: Pie chart with present/absent/late breakdown

#### 📚 Subjects Tab
- **Subject-wise Performance**: Bar chart comparing average marks across subjects
- Shows both performance and student count per subject

#### 🎯 Grades Tab
- **Grade Distribution**: Pie chart showing A+, A, B+, B, C, F distribution
- Percentage breakdown for each grade level

#### 📝 Submissions Tab
- **Assignment Submission Trends**: Stacked bar chart showing submitted vs pending assignments over 4 weeks

### 3. **Students Needing Attention**
- Always visible section highlighting students with <60% average
- Quick identification for intervention

## 🛠 Technical Implementation

### Frontend Components
```
frontend/src/pages/teacher/components/
├── PerformanceAnalyticsCard.tsx    # Main analytics component
├── QuickStatsCard.tsx              # Quick stats overview
└── TeacherBioCard.tsx              # Existing bio component
```

### Backend API Endpoints
```
GET /dashboard/teacher/quick-stats           # Quick overview stats
GET /dashboard/teacher/performance-analytics # Detailed analytics data
GET /dashboard/teacher/summary               # Existing summary (enhanced)
```

### Chart Library
- **Recharts** v3.8.1 for all visualizations
- Responsive design with dark mode support
- Interactive tooltips and legends

## 📊 Chart Types Used

1. **LineChart** - Marks trend over time
2. **PieChart** - Attendance distribution, grade distribution
3. **BarChart** - Subject performance, submission trends (stacked)

## 🎨 Design Features

- **Tabbed Interface**: Clean navigation between different analytics views
- **Color Coding**: Consistent color scheme across all charts
  - Primary: `#818cf8` (Indigo)
  - Success: `#22c55e` (Green)
  - Warning: `#f59e0b` (Amber)
  - Danger: `#ef4444` (Red)
  - Info: `#3b82f6` (Blue)

- **Grade Colors**:
  - A+: Green (`#22c55e`)
  - A: Lime (`#84cc16`)
  - B+: Yellow (`#eab308`)
  - B: Orange (`#f59e0b`)
  - C: Orange-Red (`#f97316`)
  - F: Red (`#ef4444`)

- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Dark Mode Support**: All components support dark/light themes
- **Loading States**: Skeleton loading for better UX

## 🚀 Usage

### For Teachers
1. Navigate to Teacher Dashboard
2. View Quick Stats for immediate insights
3. Explore Performance Analytics tabs for detailed analysis
4. Monitor students needing attention section
5. Use data for informed teaching decisions

### Sample Data
Run the performance data seeder to populate sample data:
```bash
node seed-performance.js
```

## 📈 Data Sources

The analytics pull from multiple database tables:
- `Submission` - Assignment marks and submission dates
- `Attendance` - Daily attendance records
- `Assignment` - Assignment creation and due dates
- `StudentEnrollment` - Course enrollments
- `Course` - Subject information

## 🔄 Real-time Updates

All charts update automatically when:
- New assignments are graded
- Attendance is marked
- Students submit assignments
- New enrollments are added

## 🎯 Benefits

1. **Data-Driven Decisions**: Visual insights for better teaching strategies
2. **Early Intervention**: Quick identification of struggling students
3. **Performance Tracking**: Monitor class progress over time
4. **Attendance Monitoring**: Visual attendance patterns
5. **Subject Comparison**: Compare performance across different subjects
6. **Trend Analysis**: Identify improvement or decline patterns

## 🔧 Customization

The analytics can be easily extended with:
- Additional chart types
- More time periods (monthly, semester views)
- Subject-specific breakdowns
- Parent/student performance comparisons
- Export functionality for reports

## 📱 Mobile Responsive

All charts and components are fully responsive:
- Stacked layout on mobile devices
- Touch-friendly interactions
- Optimized chart sizes for small screens
- Horizontal scrolling for tabs when needed