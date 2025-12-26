import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { CurriculumProvider } from './context/CurriculumContext';
import { AdmissionProvider } from './context/AdmissionContext';
import { AnnouncementProvider } from './context/AnnouncementContext';
import { CampusProvider } from './context/CampusContext';
import { ResourcesProvider } from './context/ResourcesContext';
import { Navbar } from './components/common';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Public pages (NAMED exports)
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';

// User pages (NAMED exports)
import { DashboardPage } from './pages/DashboardPage';
import { CoursesPage } from './pages/curriculum/CoursesPage';
import { CourseDetailPage } from './pages/curriculum/CourseDetailPage';
import { AssignmentDetailPage } from './pages/curriculum/AssignmentDetailPage';
import { GradesPage } from './pages/curriculum/GradesPage';
import { StaffGradesPage } from './pages/curriculum/StaffGradesPage';
import { StaffQuizzesPage } from './pages/curriculum/StaffQuizzesPage';
import { StudentQuizzesPage } from './pages/curriculum/StudentQuizzesPage';
import { QuizTakePage } from './pages/curriculum/QuizTakePage';
import { ParentProgressPage } from './pages/parent/ParentProgressPage';

import { AdmissionPage } from './pages/admission/AdmissionPage';
import { ResourcesPage, ManageResourcesPage, AllocationsPage } from './pages/resources';

// Admin pages (NAMED exports ✅)
import { AdminApplicationsPage } from './pages/admin/AdminApplicationsPage';
import { AdminCoursesPage } from './pages/admin/AdminCoursesPage';

import { ClassroomsPage } from './pages/campus/ClassroomsPage';
import { MyBookingsPage } from './pages/campus/MyBookingsPage';
import { AdminBookingRequestsPage } from './pages/campus/AdminBookingRequestsPage';
import { EventsPage } from './pages/campus/EventsPage';
import { MaintenancePage } from './pages/campus/MaintenancePage';
import { AdminMaintenancePage } from './pages/campus/AdminMaintenancePage';
import { PayrollPage } from './pages/campus/PayrollPage';
import { ResearchHubPage } from './pages/campus/ResearchHubPage';
import { PublishResearchPage } from './pages/campus/PublishResearchPage';

// Community pages (DEFAULT exports ✅)
import MessagesPage from './pages/messages/MessagesPage';
import EnhancedAnnouncementsPage from './pages/community/EnhancedAnnouncementsPage';
import { AnnouncementsPage } from './pages/community/AnnouncementsPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CurriculumProvider>
          <AdmissionProvider>
            <AnnouncementProvider>
              <CampusProvider>
                <ResourcesProvider>
                  <div className="min-h-screen bg-gray-50">
                    <Navbar />
                    <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />

                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/courses"
                      element={
                        <ProtectedRoute>
                          <CoursesPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/courses/:courseId"
                      element={
                        <ProtectedRoute>
                          <CourseDetailPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/assignments/:assignmentId"
                      element={
                        <ProtectedRoute>
                          <AssignmentDetailPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/grades"
                      element={
                        <ProtectedRoute>
                          <GradesPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/admission"
                      element={
                        <AdmissionPage />
                      }
                    />

                    <Route
                      path="/announcements"
                      element={
                        <ProtectedRoute>
                          <AnnouncementsPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/admin/applications"
                      element={
                        <ProtectedRoute roles={['admin']}>
                          <AdminApplicationsPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/admin/courses"
                      element={
                        <ProtectedRoute roles={['admin']}>
                          <AdminCoursesPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/admin/courses/new"
                      element={
                        <ProtectedRoute roles={['admin']}>
                          <AdminCoursesPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/staff/courses"
                      element={
                        <ProtectedRoute roles={['staff']}>
                          <CoursesPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/staff/grades"
                      element={
                        <ProtectedRoute roles={['staff']}>
                          <StaffGradesPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/staff/quizzes"
                      element={
                        <ProtectedRoute roles={['staff', 'admin']}>
                          <StaffQuizzesPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/quizzes"
                      element={
                        <ProtectedRoute roles={['student']}>
                          <StudentQuizzesPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/quizzes/:quizId"
                      element={
                        <ProtectedRoute roles={['student']}>
                          <QuizTakePage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/parent/progress"
                      element={
                        <ProtectedRoute roles={['parent']}>
                          <ParentProgressPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/staff/payroll"
                      element={
                        <ProtectedRoute roles={['staff']}>
                          <PayrollPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/classrooms"
                      element={
                        <ProtectedRoute>
                          <ClassroomsPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/classrooms/bookings"
                      element={
                        <ProtectedRoute>
                          <MyBookingsPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/admin/classroom-bookings"
                      element={
                        <ProtectedRoute roles={['admin', 'staff']}>
                          <AdminBookingRequestsPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/events"
                      element={
                        <ProtectedRoute>
                          <EventsPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/maintenance"
                      element={
                        <ProtectedRoute>
                          <MaintenancePage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/admin/maintenance"
                      element={
                        <ProtectedRoute roles={['admin', 'staff']}>
                          <AdminMaintenancePage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/research"
                      element={
                        <ProtectedRoute>
                          <ResearchHubPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/research/publish"
                      element={
                        <ProtectedRoute>
                          <PublishResearchPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/messages"
                      element={
                        <ProtectedRoute>
                          <MessagesPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/resources"
                      element={
                        <ProtectedRoute roles={['student']}>
                          <ResourcesPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/staff/resources"
                      element={
                        <ProtectedRoute roles={['staff', 'admin']}>
                          <ManageResourcesPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/staff/resources/allocations"
                      element={
                        <ProtectedRoute roles={['staff', 'admin']}>
                          <AllocationsPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
                </ResourcesProvider>
              </CampusProvider>
            </AnnouncementProvider>
          </AdmissionProvider>
        </CurriculumProvider>
      </AuthProvider>
    </Router >
  );
}

export default App;

