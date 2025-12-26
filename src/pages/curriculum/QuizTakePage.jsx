import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Send, CheckCircle } from 'lucide-react';
import { quizApi } from '../../utils/api';
import { Card, CardBody, Button } from '../../components/common';
import { formatDate } from '../../utils/dateUtils';

export const QuizTakePage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuizDetails();
    checkIfSubmitted();
  }, [quizId]);

  const fetchQuizDetails = async () => {
    try {
      setLoading(true);
      const res = await quizApi.getQuizDetails(quizId);
      setQuiz(res.data);

      const initialAnswers = {};
      if (res.data.questions) {
        res.data.questions.forEach((q) => {
          initialAnswers[q.id] = '';
        });
      }
      setAnswers(initialAnswers);
    } catch (err) {
      console.error('Error fetching quiz:', err);
      setError('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const checkIfSubmitted = async () => {
    try {
      const res = await quizApi.getStudentResult(quizId);
      if (res.data && res.data.submission && res.data.submission.submitted_at) {
        setSubmitted(true);
        setResult(res.data);
      }
    } catch (err) {
      // No submission yet
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit this quiz? You cannot change your answers after submitting.')) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const answerArray = Object.entries(answers).map(([questionId, answerText]) => ({
        questionId: parseInt(questionId),
        answerText: String(answerText),
      }));

      const res = await quizApi.submitQuiz(quizId, answerArray);
      setSubmitted(true);
      
      const resultRes = await quizApi.getStudentResult(quizId);
      setResult(resultRes.data);
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError(err.response?.data?.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-secondary-600">Loading quiz...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
          <Button onClick={() => navigate('/quizzes')} className="mt-4">
            Back to Quizzes
          </Button>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-secondary-900 mb-2">Quiz Submitted!</h2>
                <p className="text-secondary-600 mb-6">Your answers have been recorded</p>

                <div className="max-w-md mx-auto bg-primary-50 rounded-lg p-6 mb-6">
                  <div className="text-4xl font-bold text-primary-800 mb-2">
                    {Number(result.submission.score || 0).toFixed(1)} points
                  </div>
                  <p className="text-secondary-600">Your Score</p>
                </div>

                {result.answers && result.answers.length > 0 && (
                  <div className="text-left space-y-4 mt-8">
                    <h3 className="text-xl font-bold text-secondary-900 mb-4">Your Answers</h3>
                    {result.answers.map((ans, idx) => (
                      <div key={ans.id} className="border rounded-lg p-4 bg-gray-50">
                        <p className="font-medium text-secondary-900 mb-2">
                          Question {idx + 1}: {ans.question_text}
                        </p>
                        <p className="text-secondary-700 mb-1">
                          Your answer: <span className="font-medium">{ans.answer_text || '(No answer)'}</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                              ans.is_correct ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {ans.is_correct ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                          <span className="text-sm text-secondary-600">
                            {ans.points_awarded}/{ans.max_points} points
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button onClick={() => navigate('/quizzes')} className="mt-8">
                  Back to Quizzes
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardBody>
            <h1 className="text-3xl font-bold text-secondary-900 mb-2">{quiz?.title}</h1>
            {quiz?.description && <p className="text-secondary-600 mb-4">{quiz.description}</p>}

            <div className="flex flex-wrap gap-4 text-sm text-secondary-600">
              {quiz?.due_date && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Due: {formatDate(quiz.due_date)}</span>
                </div>
              )}
              {quiz?.time_limit_minutes && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Time Limit: {quiz.time_limit_minutes} minutes</span>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          {quiz?.questions?.map((question, idx) => (
            <Card key={question.id}>
              <CardBody>
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-secondary-900 mb-2">
                    Question {idx + 1} ({question.points} {question.points === 1 ? 'point' : 'points'})
                  </h3>
                  <p className="text-secondary-700">{question.question_text}</p>
                </div>

                {question.question_type === 'mcq' && question.options && Array.isArray(question.options) ? (
                  <div className="space-y-2">
                    {question.options.map((option, optIdx) => (
                      <label
                        key={optIdx}
                        className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option}
                          checked={answers[question.id] === option}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="mr-3 w-4 h-4"
                        />
                        <span className="text-secondary-700">{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="Enter your answer here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows="4"
                  />
                )}
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <Button variant="secondary" onClick={() => navigate('/quizzes')}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        </div>
      </div>
    </div>
  );
};
