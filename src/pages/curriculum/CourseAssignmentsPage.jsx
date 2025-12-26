import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileText } from 'lucide-react';
import { useCurriculum } from '../../context/CurriculumContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardBody } from '../../components/common';

export const CourseAssignmentsPage = () => {
  const { userRole } = useAuth();
  const { courses, enrolledCourses, getAssignmentsByCourse } = useCurriculum();

  const enrolledCoursesList = useMemo(() => {
    if (userRole === 'staff' || userRole === 'admin') {
      return courses;
    }
    return courses.filter((course) => enrolledCourses.includes(course.id));
  }, [courses, enrolledCourses, userRole]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-secondary-900">Course Assignments</h1>
          <p className="text-secondary-600 mt-2">Select a course to view its assignments</p>
        </div>

        {enrolledCoursesList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCoursesList.map((course) => {
              const assignments = getAssignmentsByCourse(course.id);
              const pendingAssignments = assignments.filter((a) => !a.submitted).length;
              return (
                <Card key={course.id} hoverable className="flex flex-col h-full">
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="inline-block px-2 py-1 text-xs font-semibold bg-primary-100 text-primary-700 rounded mb-2">
                          {course.code}
                        </span>
                        <h3 className="text-lg font-bold text-secondary-800">{course.name}</h3>
                      </div>
                      <div className="text-xs text-secondary-600">
                        {assignments.length} {assignments.length === 1 ? 'assignment' : 'assignments'}
                      </div>
                    </div>
                    <p className="text-sm text-secondary-600">{course.instructor}</p>
                  </div>

                  <div className="flex-1 mb-4">
                    <p className="text-sm text-secondary-600 mb-4 line-clamp-2">{course.description}</p>

                    <div className="space-y-2 text-sm border-b border-gray-200 pb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-secondary-600">Course Code</span>
                        <span className="font-medium text-secondary-800">{course.code}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-secondary-600">Pending</span>
                        <span className={`font-medium ${pendingAssignments > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {pendingAssignments} pending
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link 
                    to={`/assignments?courseId=${course.id}`}
                    className="w-full"
                  >
                    <div className="flex items-center justify-center w-full px-4 py-2 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition cursor-pointer">
                      <FileText className="w-4 h-4 mr-2 text-primary-600" />
                      <span className="text-sm font-medium text-primary-700">View Assignments</span>
                    </div>
                  </Link>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="col-span-full text-center py-12">
            <BookOpen className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
            <p className="text-secondary-600 text-lg">
              {userRole === 'student' ? 'No courses enrolled yet' : 'No courses available'}
            </p>
            <p className="text-secondary-500">
              {userRole === 'student' 
                ? 'Enroll in courses to view assignments' 
                : 'No assignments available for your courses'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};