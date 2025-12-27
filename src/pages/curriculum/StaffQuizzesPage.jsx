import React, { useState, useEffect } from 'react';
import { Plus, ClipboardList, Calendar, Clock, Trash2 } from 'lucide-react';
import { quizApi } from '../../utils/api';
import { useCurriculum } from '../../context/CurriculumContext';
import { Card, CardHeader, CardBody, Button, FormInput, Modal } from '../../components/common';
import { formatDate } from '../../utils/dateUtils';

export const StaffQuizzesPage = () => {
  const { courses } = useCurriculum();
  const [quizzes, setQuizzes] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [quizForm, setQuizForm] = useState({
    courseId: '',
    title: '',
    description: '',
    dueDate: '',
    timeLimitMinutes: '',
    questions: [
      {
        questionText: '',
        questionType: 'mcq',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 1,
      },
    ],
  });

  useEffect(() => {
    if (selectedCourse) {
      fetchQuizzes();
    }
  }, [selectedCourse]);

  const fetchQuizzes = async () => {
    if (!selectedCourse) return;
    try {
      setLoading(true);
      const response = await quizApi.getQuizzesByCourse(selectedCourse);
      setQuizzes(response.data || []);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setQuizForm({
      ...quizForm,
      questions: [
        ...quizForm.questions,
        {
          questionText: '',
          questionType: 'mcq',
          options: ['', '', '', ''],
          correctAnswer: '',
          points: 1,
        },
      ],
    });
  };

  const handleRemoveQuestion = (index) => {
    const updated = [...quizForm.questions];
    updated.splice(index, 1);
    setQuizForm({ ...quizForm, questions: updated });
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...quizForm.questions];
    updated[index][field] = value;
    setQuizForm({ ...quizForm, questions: updated });
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const updated = [...quizForm.questions];
    updated[qIndex].options[optIndex] = value;
    setQuizForm({ ...quizForm, questions: updated });
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    setError('');

    if (!quizForm.courseId || !quizForm.title || quizForm.questions.length === 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await quizApi.createQuiz({
        courseId: parseInt(quizForm.courseId),
        title: quizForm.title,
        description: quizForm.description,
        dueDate: quizForm.dueDate || null,
        timeLimitMinutes: quizForm.timeLimitMinutes ? parseInt(quizForm.timeLimitMinutes) : null,
        questions: quizForm.questions.map((q, idx) => ({
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.questionType === 'mcq' ? q.options.filter(o => o.trim()) : [],
          correctAnswer: q.correctAnswer,
          points: parseInt(q.points) || 1,
          orderIndex: idx,
        })),
      });

      setShowCreateModal(false);
      setQuizForm({
        courseId: '',
        title: '',
        description: '',
        dueDate: '',
        timeLimitMinutes: '',
        questions: [
          {
            questionText: '',
            questionType: 'mcq',
            options: ['', '', '', ''],
            correctAnswer: '',
            points: 1,
          },
        ],
      });
      
      if (selectedCourse) {
        fetchQuizzes();
      }
    } catch (err) {
      console.error('Error creating quiz:', err);
      setError(err.response?.data?.message || 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-secondary-900">Quiz Management</h1>
            <p className="text-secondary-600 mt-2">Create and manage quizzes for your courses</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create Quiz
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Course to View Quizzes
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">-- Select a Course --</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-secondary-600">Loading...</p>
            </div>
          </Card>
        ) : selectedCourse ? (
          <div className="space-y-4">
            {quizzes.length > 0 ? (
              quizzes.map((quiz) => (
                <Card key={quiz.id}>
                  <CardBody>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-secondary-900 mb-2">{quiz.title}</h3>
                        {quiz.description && (
                          <p className="text-secondary-600 mb-3">{quiz.description}</p>
                        )}
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
                        <div className="mt-2 text-sm text-secondary-500">
                          Created by {quiz.creator_name || 'Staff'} on {formatDate(quiz.created_at)}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))
            ) : (
              <Card>
                <div className="text-center py-12">
                  <ClipboardList className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                  <p className="text-secondary-600 text-lg">No quizzes found for this course</p>
                  <p className="text-secondary-500">Create your first quiz to get started</p>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <ClipboardList className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
              <p className="text-secondary-600 text-lg">Select a course to view quizzes</p>
            </div>
          </Card>
        )}

        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Quiz"
        >
          <form onSubmit={handleCreateQuiz} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
              <select
                value={quizForm.courseId}
                onChange={(e) => setQuizForm({ ...quizForm, courseId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
            </div>

            <FormInput
              label="Quiz Title *"
              value={quizForm.title}
              onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={quizForm.description}
                onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows="3"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Due Date"
                type="datetime-local"
                value={quizForm.dueDate}
                onChange={(e) => setQuizForm({ ...quizForm, dueDate: e.target.value })}
              />
              <FormInput
                label="Time Limit (minutes)"
                type="number"
                value={quizForm.timeLimitMinutes}
                onChange={(e) => setQuizForm({ ...quizForm, timeLimitMinutes: e.target.value })}
                min="1"
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Questions</h3>
                <Button type="button" onClick={handleAddQuestion} size="sm">
                  Add Question
                </Button>
              </div>

              <div className="space-y-6 max-h-96 overflow-y-auto">
                {quizForm.questions.map((question, qIdx) => (
                  <div key={qIdx} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium">Question {qIdx + 1}</h4>
                      {quizForm.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <textarea
                        value={question.questionText}
                        onChange={(e) => handleQuestionChange(qIdx, 'questionText', e.target.value)}
                        placeholder="Enter question text"
                        className="w-full px-3 py-2 border rounded-lg"
                        rows="2"
                        required
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={question.questionType}
                          onChange={(e) => handleQuestionChange(qIdx, 'questionType', e.target.value)}
                          className="px-3 py-2 border rounded-lg"
                        >
                          <option value="mcq">Multiple Choice</option>
                          <option value="short_answer">Short Answer</option>
                        </select>

                        <input
                          type="number"
                          value={question.points}
                          onChange={(e) => handleQuestionChange(qIdx, 'points', e.target.value)}
                          placeholder="Points"
                          className="px-3 py-2 border rounded-lg"
                          min="1"
                          required
                        />
                      </div>

                      {question.questionType === 'mcq' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Options:</label>
                          {question.options.map((option, optIdx) => (
                            <input
                              key={optIdx}
                              value={option}
                              onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                              placeholder={`Option ${optIdx + 1}`}
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          ))}
                        </div>
                      )}

                      <input
                        value={question.correctAnswer}
                        onChange={(e) => handleQuestionChange(qIdx, 'correctAnswer', e.target.value)}
                        placeholder="Correct answer"
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Quiz'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};
