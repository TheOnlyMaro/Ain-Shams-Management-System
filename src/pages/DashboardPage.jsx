import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAnnouncement } from '../context/AnnouncementContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useAdmission } from '../context/AdmissionContext';
import { Card, CardHeader, CardBody, CardFooter } from '../components/common';
import { BookOpen, FileText, Bell, ClipboardList, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatTimeAgo } from '../utils/dateUtils';

export const DashboardPage = () => {
  const { user, userRole } = useAuth();
  const { announcements } = useAnnouncement();
  const { enrolledCourses, courses, assignments } = useCurriculum();
  const { applications } = useAdmission();

  const recentAnnouncements = useMemo(() => {
    return announcements.slice(0, 3);
  }, [announcements]);

  const enrolledCoursesList = useMemo(() => {
    return courses.filter((c) => enrolledCourses.includes(c.id)).slice(0, 3);
  }, [courses, enrolledCourses]);

  const upcomingAssignments = useMemo(() => {
    return assignments
      .filter((a) => !a.submitted)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 3);
  }, [assignments]);

  const renderStudentDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-600 text-sm font-medium">Enrolled Courses</p>
              <p className="text-3xl font-bold text-secondary-800">{enrolledCourses.length}</p>
            </div>
            <BookOpen className="w-12 h-12 text-primary-100 bg-primary-50 rounded-lg p-2" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-600 text-sm font-medium">Pending Assignments</p>
              <p className="text-3xl font-bold text-secondary-800">
                {assignments.filter((a) => !a.submitted).length}
              </p>
            </div>
            <FileText className="w-12 h-12 text-orange-100 bg-orange-50 rounded-lg p-2" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-600 text-sm font-medium">Announcements</p>
              <p className="text-3xl font-bold text-secondary-800">{announcements.length}</p>
            </div>
            <Bell className="w-12 h-12 text-green-100 bg-green-50 rounded-lg p-2" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-600 text-sm font-medium">GPA</p>
              <p className="text-3xl font-bold text-secondary-800">3.85</p>
            </div>
            <TrendingUp className="w-12 h-12 text-blue-100 bg-blue-50 rounded-lg p-2" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold text-secondary-800">Your Courses</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {enrolledCoursesList.length > 0 ? (
              enrolledCoursesList.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-primary-50 transition"
                >
                  <div>
                    <p className="font-semibold text-secondary-800">{course.code}</p>
                    <p className="text-sm text-secondary-600">{course.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-secondary-600">{course.instructor}</p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-secondary-600 text-center py-4">No courses enrolled yet</p>
            )}
          </CardBody>
          <CardFooter>
            <Link
              to="/courses"
              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              View All Courses →
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold text-secondary-800">Upcoming Assignments</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {upcomingAssignments.length > 0 ? (
              upcomingAssignments.map((assignment) => (
                <div key={assignment.id} className="p-3 rounded-lg bg-gray-50">
                  <p className="font-semibold text-secondary-800">{assignment.title}</p>
                  <p className="text-sm text-secondary-600 mt-1">{assignment.courseName}</p>
                  <p className="text-xs text-orange-600 mt-2">
                    Due: {new Date(assignment.dueDate).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-secondary-600 text-center py-4">No pending assignments</p>
            )}
          </CardBody>
          <CardFooter>
            <Link
              to="/courses"
              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              View Course Details →
            </Link>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-bold text-secondary-800">Latest Announcements</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          {recentAnnouncements.map((announcement) => (
            <div key={announcement.id} className="p-3 rounded-lg bg-gray-50 border-l-4 border-primary-600">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-secondary-800">{announcement.title}</p>
                  <p className="text-sm text-secondary-600 mt-1 line-clamp-2">
                    {announcement.content}
                  </p>
                  <p className="text-xs text-secondary-500 mt-2">{formatTimeAgo(announcement.createdAt)}</p>
                </div>
                {announcement.priority === 'high' && (
                  <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                    High Priority
                  </span>
                )}
              </div>
            </div>
          ))}
        </CardBody>
        <CardFooter>
          <Link
            to="/announcements"
            className="text-primary-600 hover:text-primary-700 font-medium text-sm"
          >
            View All Announcements →
          </Link>
        </CardFooter>
      </Card>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-600 text-sm font-medium">Total Applications</p>
              <p className="text-3xl font-bold text-secondary-800">{applications.length}</p>
            </div>
            <ClipboardList className="w-12 h-12 text-primary-100 bg-primary-50 rounded-lg p-2" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-600 text-sm font-medium">Pending Review</p>
              <p className="text-3xl font-bold text-secondary-800">
                {applications.filter((a) => a.applicationStatus === 'pending').length}
              </p>
            </div>
            <FileText className="w-12 h-12 text-orange-100 bg-orange-50 rounded-lg p-2" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-600 text-sm font-medium">Approved</p>
              <p className="text-3xl font-bold text-secondary-800">
                {applications.filter((a) => a.applicationStatus === 'approved').length}
              </p>
            </div>
            <Users className="w-12 h-12 text-green-100 bg-green-50 rounded-lg p-2" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-600 text-sm font-medium">Total Courses</p>
              <p className="text-3xl font-bold text-secondary-800">{courses.length}</p>
            </div>
            <BookOpen className="w-12 h-12 text-blue-100 bg-blue-50 rounded-lg p-2" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold text-secondary-800">Recent Applications</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {applications.slice(0, 5).map((app) => (
              <Link
                key={app.id}
                to={`/admin/applications/${app.id}`}
                className="p-3 rounded-lg bg-gray-50 hover:bg-primary-50 transition"
              >
                <p className="font-semibold text-secondary-800">{app.studentName}</p>
                <p className="text-sm text-secondary-600">{app.appliedProgram}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-secondary-500">
                    {new Date(app.submittedAt).toLocaleDateString()}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      app.applicationStatus === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : app.applicationStatus === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {app.applicationStatus.charAt(0).toUpperCase() + app.applicationStatus.slice(1)}
                  </span>
                </div>
              </Link>
            ))}
          </CardBody>
          <CardFooter>
            <Link
              to="/admin/applications"
              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              View All Applications →
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold text-secondary-800">System Announcements</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {announcements.slice(0, 5).map((announcement) => (
              <div key={announcement.id} className="p-3 rounded-lg bg-gray-50">
                <p className="font-semibold text-secondary-800 text-sm">{announcement.title}</p>
                <p className="text-xs text-secondary-600 mt-1">by {announcement.author}</p>
              </div>
            ))}
          </CardBody>
          <CardFooter>
            <Link
              to="/admin/announcements"
              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              Manage Announcements →
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );

  const renderStaffDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-600 text-sm font-medium">My Courses</p>
              <p className="text-3xl font-bold text-secondary-800">{courses.length}</p>
            </div>
            <BookOpen className="w-12 h-12 text-primary-100 bg-primary-50 rounded-lg p-2" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-600 text-sm font-medium">Materials Uploaded</p>
              <p className="text-3xl font-bold text-secondary-800">12</p>
            </div>
            <FileText className="w-12 h-12 text-blue-100 bg-blue-50 rounded-lg p-2" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-600 text-sm font-medium">Pending Grading</p>
              <p className="text-3xl font-bold text-secondary-800">8</p>
            </div>
            <FileText className="w-12 h-12 text-orange-100 bg-orange-50 rounded-lg p-2" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-600 text-sm font-medium">Total Students</p>
              <p className="text-3xl font-bold text-secondary-800">245</p>
            </div>
            <Users className="w-12 h-12 text-green-100 bg-green-50 rounded-lg p-2" />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-bold text-secondary-800">Quick Actions</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link
            to="/staff/courses"
            className="p-4 rounded-lg bg-green-50 hover:bg-green-100 transition text-center"
          >
            <BookOpen className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <p className="text-sm font-medium text-secondary-800">Manage Courses</p>
          </Link>
          <Link
            to="/staff/grades"
            className="p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition text-center"
          >
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <p className="text-sm font-medium text-secondary-800">Grade Assignments</p>
          </Link>
          <Link
            to="/admin/announcements"
            className="p-4 rounded-lg bg-orange-50 hover:bg-orange-100 transition text-center"
          >
            <Bell className="w-6 h-6 mx-auto mb-2 text-orange-600" />
            <p className="text-sm font-medium text-secondary-800">Post Announcements</p>
          </Link>
        </CardBody>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-secondary-900">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-secondary-600 mt-2">
            Here's what's happening in your {userRole === 'student' ? 'academic' : userRole} account
          </p>
        </div>

        {userRole === 'student' && renderStudentDashboard()}
        {userRole === 'admin' && renderAdminDashboard()}
        {userRole === 'staff' && renderStaffDashboard()}
        {userRole === 'parent' && renderStudentDashboard()}
      </div>
    </div>
  );
};
