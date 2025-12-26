import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, CheckCircle } from 'lucide-react';
import { useCurriculum } from '../../context/CurriculumContext';
import { Card, CardHeader, CardBody, Button, FormTextarea, FormInput } from '../../components/common';
import { formatDate } from '../../utils/dateUtils';

export const AssignmentDetailPage = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { getAssignmentById, submitAssignment } = useCurriculum();

  const assignment = useMemo(() => getAssignmentById(assignmentId), [getAssignmentById, assignmentId]);

  const [submissionText, setSubmissionText] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <h1 className="text-xl font-bold text-secondary-900">Assignment not found</h1>
            </CardHeader>
            <CardBody>
              <p className="text-secondary-600">The assignment you're looking for doesn't exist.</p>
              <div className="mt-4">
                <Link to="/assignments" className="text-primary-600 hover:text-primary-700 font-medium">
                  Back to Assignments
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!submissionText.trim() && !file) {
      setError('Please provide a submission (text and/or file).');
      return;
    }

    submitAssignment(assignment.id, {
      text: submissionText.trim(),
      fileName: file?.name || null,
    });

    navigate('/assignments');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-secondary-900">{assignment.title}</h1>
                <p className="text-secondary-600 mt-1">{assignment.courseName || 'Course'}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-secondary-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Due: {formatDate(assignment.dueDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {assignment.totalPoints} points
                  </span>
                </div>
              </div>

              {assignment.submitted && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Submitted</span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardBody>
            <div className="mb-6">
              <p className="text-secondary-700">{assignment.description || 'No description provided.'}</p>
            </div>

            {assignment.submitted ? (
              <div className="p-4 rounded-lg bg-gray-50 border">
                <p className="font-semibold text-secondary-800">Your submission</p>
                <p className="text-sm text-secondary-600 mt-1">
                  Submitted at: {assignment.submittedAt ? formatDate(assignment.submittedAt) : 'N/A'}
                </p>
                {assignment.submission?.text && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-secondary-700">Text</p>
                    <p className="text-sm text-secondary-700 whitespace-pre-wrap mt-1">
                      {assignment.submission.text}
                    </p>
                  </div>
                )}
                {assignment.submission?.fileName && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-secondary-700">File</p>
                    <p className="text-sm text-secondary-700 mt-1">{assignment.submission.fileName}</p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>}

                <FormTextarea
                  label="Submission text"
                  name="submission"
                  rows={6}
                  placeholder="Write your submission here..."
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                />

                <FormInput
                  label="Attach file (optional)"
                  name="file"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />

                <Button variant="primary" className="w-full">
                  Submit Assignment
                </Button>
              </form>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
