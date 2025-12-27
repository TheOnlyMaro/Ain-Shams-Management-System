import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Calendar, Clock, PlayCircle } from 'lucide-react';
import { quizApi } from '../../utils/api';
import { useCurriculum } from '../../context/CurriculumContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardBody, Button } from '../../components/common';
import { formatDate } from '../../utils/dateUtils';

export const StudentQuizzesPage = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { courses, enrolledCourses } = useCurriculum();

  const [selectedCourse, setSelectedCourse] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const visibleCourses = useMemo(() => {
    if (userRole !== 'student') return courses;
    if (!Array.isArray(enrolledCourses) || enrolledCourses.length === 0) return [];
    return courses.filter((c) => enrolledCourses.some((id) => String(id) === String(c.id)));
  }, [courses, enrolledCourses, userRole]);

  useEffect(() => {
    if (!selectedCourse && visibleCourses.length > 0) {
      setSelectedCourse(String(visibleCourses[0].id));
    }
  }, [visibleCourses, selectedCourse]);

  useEffect(() => {
    if (selectedCourse) fetchQuizzes();
  }, [selectedCourse]);

  const fetchQuizzes = async () => {
    if (!selectedCourse) return;
    setError('');
    try {
      setLoading(true);
      const res = await quizApi.getQuizzesByCourse(selectedCourse);
      setQuizzes(res.data || []);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeQuiz = async (quizId) => {
    try {
      await quizApi.startQuiz(quizId);
    } catch (err) {
      console.warn('startQuiz failed (may already exist):', err);
    }
    navigate(`/quizzes/${quizId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-secondary-900">Quizzes</h1>
          <p className="text-secondary-600 mt-2">Access and submit your course quizzes</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {visibleCourses.length === 0 ? (
              <option value="">No enrolled courses found</option>
            ) : (
              visibleCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))
            )}
          </select>
        </div>

        {loading ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-secondary-600">Loading quizzes...</p>
            </div>
          </Card>
        ) : quizzes.length > 0 ? (
          <div className="space-y-4">
            {quizzes.map((quiz) => (
              <Card key={quiz.id}>
                <CardBody>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-secondary-900 mb-2">{quiz.title}</h3>
                      {quiz.description && <p className="text-secondary-600 mb-3">{quiz.description}</p>}

                      <div className="flex flex-wrap gap-4 text-sm text-secondary-600">
                        <div className="flex items-center gap-1">
                          <ClipboardList className="w-4 h-4" />
                          <span>{quiz.question_count || 0} questions</span>
                        </div>
                        {quiz.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Due: {formatDate(quiz.due_date)}</span>
                          </div>
                        )}
                        {quiz.time_limit_minutes && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{quiz.time_limit_minutes} minutes</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button onClick={() => handleTakeQuiz(quiz.id)} className="flex items-center gap-2">
                      <PlayCircle className="w-5 h-5" />
                      Take Quiz
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <ClipboardList className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
              <p className="text-secondary-600 text-lg">No quizzes available for this course</p>
              <p className="text-secondary-500">Quizzes will appear here when your instructor posts them</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
