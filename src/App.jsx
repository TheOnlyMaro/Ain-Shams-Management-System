import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CurriculumProvider } from './context/CurriculumContext';
import { AdmissionProvider } from './context/AdmissionContext';
import { AnnouncementProvider } from './context/AnnouncementContext';
import { Navbar } from './components/common';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { DashboardPage } from './pages/DashboardPage';

import { CoursesPage } from './pages/curriculum/CoursesPage';
import { CourseDetailPage } from './pages/curriculum/CourseDetailPage';
import { AssignmentsPage } from './pages/curriculum/AssignmentsPage';
import { GradesPage } from './pages/curriculum/GradesPage';

import { AdmissionPage } from './pages/admission/AdmissionPage';

import { AnnouncementsPage } from './pages/community/AnnouncementsPage';

import { AdminApplicationsPage } from './pages/admin/AdminApplicationsPage';
import { AdminCoursesPage } from './pages/admin/AdminCoursesPage';

export const App = () => {
  return (
    <Router>
      <AuthProvider>
        <CurriculumProvider>
          <AdmissionProvider>
            <AnnouncementProvider>
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
                    path="/assignments"
                    element={
                      <ProtectedRoute>
                        <AssignmentsPage />
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

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </AnnouncementProvider>
          </AdmissionProvider>
        </CurriculumProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
