import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Users, Clock, BookOpen, BarChart3, Plus } from 'lucide-react';
import { useCurriculum } from '../../context/CurriculumContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardBody, Button, FormInput } from '../../components/common';

export const CoursesPage = () => {
  const { userRole } = useAuth();
  const { courses, enrolledCourses, enrollCourse } = useCurriculum();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.instructor.toLowerCase().includes(searchTerm.toLowerCase());

      if (selectedFilter === 'enrolled') {
        return matchesSearch && enrolledCourses.includes(course.id);
      }
      if (selectedFilter === 'available') {
        return matchesSearch && !enrolledCourses.includes(course.id);
      }
      return matchesSearch;
    });
  }, [courses, searchTerm, selectedFilter, enrolledCourses]);

  const handleEnroll = (courseId) => {
    enrollCourse(courseId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-secondary-900">Courses</h1>
            <p className="text-secondary-600 mt-2">Browse and manage your courses</p>
          </div>
          {userRole === 'admin' && (
            <Link to="/admin/courses/new">
              <Button variant="primary" size="lg" className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Course
              </Button>
            </Link>
          )}
        </div>

        <Card className="mb-6">
          <CardBody>
            <div className="space-y-4">
              <FormInput
                label="Search Courses"
                name="search"
                type="text"
                placeholder="Search by course name, code, or instructor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    selectedFilter === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-secondary-800 hover:bg-gray-300'
                  }`}
                >
                  All Courses ({courses.length})
                </button>
                <button
                  onClick={() => setSelectedFilter('enrolled')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    selectedFilter === 'enrolled'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-secondary-800 hover:bg-gray-300'
                  }`}
                >
                  Enrolled ({enrolledCourses.length})
                </button>
                <button
                  onClick={() => setSelectedFilter('available')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    selectedFilter === 'available'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-secondary-800 hover:bg-gray-300'
                  }`}
                >
                  Available ({courses.filter((c) => !enrolledCourses.includes(c.id)).length})
                </button>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course) => {
              const isEnrolled = enrolledCourses.includes(course.id);
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
                      {isEnrolled && (
                        <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
                          Enrolled
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-secondary-600">{course.instructor}</p>
                  </div>

                  <div className="flex-1 mb-4">
                    <p className="text-sm text-secondary-600 mb-4">{course.description}</p>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-secondary-600">
                        <Clock className="w-4 h-4 mr-2" />
                        {course.schedule}
                      </div>
                      <div className="flex items-center text-secondary-600">
                        <Users className="w-4 h-4 mr-2" />
                        {course.enrolled}/{course.capacity} Students
                      </div>
                      <div className="flex items-center text-secondary-600">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        {course.credits} Credits
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <Link to={`/courses/${course.id}`} className="flex-1">
                      <Button variant="outline" size="md" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    {!isEnrolled && (
                      <Button
                        variant="primary"
                        size="md"
                        className="flex-1"
                        onClick={() => handleEnroll(course.id)}
                      >
                        Enroll
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <BookOpen className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
              <p className="text-secondary-600 text-lg">No courses found</p>
              <p className="text-secondary-500">Try adjusting your search terms</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
