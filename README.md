# University Management System - Frontend

A comprehensive, modern frontend for a University Management System built with React, Vite, and Tailwind CSS. This MERN stack application provides a complete platform for managing academic and administrative processes.

## 🎯 Features

### Authentication & Authorization
- **Multi-role login system**: Student, Administrator, Staff, Parent
- **Role-based signup** with specific information collection per role
- **Protected routes** with role-based access control
- **Session management** with persistent authentication

### Student Features
- **Dashboard**: Overview of courses, assignments, and announcements
- **Course Management**: Browse, search, and enroll in courses
- **Course Materials**: Access and download course materials
- **Assignments**: View, filter, and submit assignments
- **Grades**: Track academic performance with detailed breakdown
- **Announcements**: Stay updated with university announcements

### Administrator Features
- **Application Management**: Review and process admission applications with status tracking
- **Course Management**: Create, edit, and delete courses
- **System-wide Announcements**: Post announcements with priority levels
- **Dashboard Analytics**: Overview of applications and system statistics

### Staff Features
- **Course Management**: Manage assigned courses
- **Material Upload**: Upload and manage course materials
- **Assignment Grading**: Grade student assignments
- **Announcements**: Post staff announcements

### General Features
- **Responsive Design**: Mobile-first, fully responsive UI
- **Modern UI/UX**: Beautiful, intuitive interface with smooth animations
- **Real-time Navigation**: Quick access to all features
- **Search & Filter**: Advanced filtering capabilities
- **Dark Mode Ready**: Tailwind CSS color system

## 📁 Project Structure

```
src/
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.jsx          # Route protection component
│   └── common/
│       ├── Navbar.jsx                  # Navigation bar
│       ├── Button.jsx                  # Reusable button component
│       ├── Card.jsx                    # Card components
│       ├── FormInput.jsx               # Form input components
│       ├── Modal.jsx                   # Modal dialog
│       ├── Alert.jsx                   # Alert notifications
│       ├── LoadingSpinner.jsx          # Loading indicator
│       └── index.js                    # Component exports
├── context/
│   ├── AuthContext.jsx                 # Authentication state management
│   ├── CurriculumContext.jsx           # Curriculum state management
│   ├── AdmissionContext.jsx            # Admission state management
│   └── AnnouncementContext.jsx         # Announcements state management
├── pages/
│   ├── auth/
│   │   ├── LoginPage.jsx               # Login page
│   │   └── SignupPage.jsx              # Sign-up page
│   ├── curriculum/
│   │   ├── CoursesPage.jsx             # Browse and manage courses
│   │   ├── CourseDetailPage.jsx        # Course details and materials
│   │   ├── AssignmentsPage.jsx         # View and submit assignments
│   │   └── GradesPage.jsx              # View grades and performance
│   ├── admission/
│   │   └── AdmissionPage.jsx           # Admission applications
│   ├── community/
│   │   └── AnnouncementsPage.jsx       # View announcements
│   ├── admin/
│   │   ├── AdminApplicationsPage.jsx   # Manage applications
│   │   └── AdminCoursesPage.jsx        # Manage courses
│   ├── HomePage.jsx                    # Landing page
│   ├── DashboardPage.jsx               # Dashboard
├── utils/
│   ├── api.js                          # API client and endpoints
│   ├── dateUtils.js                    # Date formatting utilities
│   └── validation.js                   # Form validation utilities
├── App.jsx                             # Main app component with routing
├── main.jsx                            # Entry point
└── index.css                           # Global styles
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository** (or navigate to the project directory)
   ```bash
   cd /home/engine/project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

The application will open in your browser at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

## 🔐 Authentication

### Demo Credentials

For testing purposes, use any email and password combination. The system will create a mock session:

```
Email: demo@example.com
Password: password123 (min 8 characters)
```

### Roles

1. **Student**
   - Access: Courses, Assignments, Grades, Announcements, Admission
   - Features: Enroll in courses, submit assignments, view materials

2. **Administrator**
   - Access: All student features + Admin panel
   - Features: Manage applications, courses, announcements

3. **Staff**
   - Access: Course management, grading, announcements
   - Features: Upload materials, grade assignments

4. **Parent**
   - Access: Announcements, view student info (placeholder)
   - Features: Receive notifications

## 🎨 Customization

### Color Scheme
Edit `tailwind.config.js` to customize colors:

```javascript
colors: {
  primary: { ... },      // Main brand color (blue)
  secondary: { ... },    // Secondary color (slate)
}
```

### Animations
Animations are defined in `tailwind.config.js` and `src/index.css`. Customize or add new animations as needed.

## 📱 Responsive Design

The application is fully responsive with breakpoints:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## 🔗 API Integration

### Setting Up Backend Connection

1. Update `.env` with your backend URL:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

2. API endpoints are in `src/utils/api.js`. The client automatically adds authorization headers.

### Backend Integration

The frontend expects the following API endpoints (to be implemented):

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

#### Curriculum
- `GET /api/curriculum/courses` - Get all courses
- `POST /api/curriculum/courses` - Create course
- `PUT /api/curriculum/courses/:id` - Update course
- `DELETE /api/curriculum/courses/:id` - Delete course
- `POST /api/curriculum/courses/:id/enroll` - Enroll in course
- `GET /api/curriculum/materials` - Get course materials
- `POST /api/curriculum/courses/:id/materials` - Upload material
- `GET /api/curriculum/assignments` - Get assignments
- `POST /api/curriculum/assignments/:id/submit` - Submit assignment
- `GET /api/curriculum/grades` - Get grades
- `POST /api/curriculum/assignments/:id/grade` - Grade assignment

#### Admission
- `GET /api/admission/applications` - Get applications
- `POST /api/admission/applications` - Create application
- `PUT /api/admission/applications/:id/status` - Update status
- `POST /api/admission/applications/:id/documents` - Upload document

#### Announcements
- `GET /api/announcements` - Get announcements
- `POST /api/announcements` - Create announcement
- `PUT /api/announcements/:id` - Update announcement
- `DELETE /api/announcements/:id` - Delete announcement

## 🧪 Testing

The application currently uses mock data for demonstration. To test different roles:

1. Go to `/login`
2. Select desired role from dropdown
3. Enter any email and password (min 8 characters)
4. Click "Sign In"

## 📦 Dependencies

### Core
- `react` - UI library
- `react-dom` - React DOM rendering
- `react-router-dom` - Routing

### Utilities
- `axios` - HTTP client
- `date-fns` - Date formatting
- `lucide-react` - Icons
- `react-hot-toast` - Notifications (optional)

### Styling
- `tailwindcss` - CSS framework
- `postcss` - CSS processing
- `autoprefixer` - CSS vendor prefixing

## 🛠️ Development

### Available Scripts
```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint (when configured)
```

### Best Practices
1. Use components from `src/components/common` for consistency
2. Utilize context providers for state management
3. Follow existing naming conventions
4. Keep components focused and reusable
5. Use Tailwind CSS classes instead of custom CSS

## 📝 File Naming Conventions

- **Components**: PascalCase (e.g., `CoursesPage.jsx`)
- **Utilities**: camelCase (e.g., `dateUtils.js`)
- **Contexts**: PascalCase with "Context" suffix (e.g., `AuthContext.jsx`)
- **Folders**: lowercase (e.g., `components/`, `pages/`, `utils/`)

## 🔒 Security Notes

This is a frontend application. Important security considerations:

1. **Authentication Tokens**: Store securely (currently using localStorage)
2. **API Keys**: Never commit to version control
3. **Sensitive Data**: Don't store passwords or sensitive info in localStorage
4. **API Calls**: Always validate on the backend
5. **CORS**: Configure appropriately with your backend

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### GitHub Pages
```bash
npm run build
npm install gh-pages --save-dev
```

### Traditional Server
```bash
npm run build
# Upload dist/ folder to your server
```

## 🤝 Contributing

When adding new features:

1. Create a new branch for each feature
2. Follow existing code style and structure
3. Add new context/state if needed
4. Update this README if adding new features
5. Test on multiple screen sizes

## 📄 License

This project is part of the University Management System initiative.

## 📞 Support

For issues or questions, please refer to the project documentation or contact the development team.

## 🎓 Learning Resources

- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)
- [Vite Documentation](https://vitejs.dev)

---

**Built with ❤️ for educational excellence**
