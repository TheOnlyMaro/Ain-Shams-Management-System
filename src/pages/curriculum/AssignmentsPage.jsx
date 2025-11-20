import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { useCurriculum } from '../../context/CurriculumContext';
import { Card, CardBody, Button, FormSelect } from '../../components/common';
import { formatDate, daysUntil, isDatePast } from '../../utils/dateUtils';

export const AssignmentsPage = () => {
  const navigate = useNavigate();
  const { assignments, courses } = useCurriculum();
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      if (filterStatus === 'submitted') return assignment.submitted;
      if (filterStatus === 'pending') return !assignment.submitted;
      return true;
    });
  }, [assignments, filterStatus]);

  const sortedAssignments = useMemo(() => {
    return [...filteredAssignments].sort(
      (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
    );
  }, [filteredAssignments]);

  const stats = useMemo(() => {
    return {
      total: assignments.length,
      submitted: assignments.filter((a) => a.submitted).length,
      pending: assignments.filter((a) => !a.submitted).length,
      overdue: assignments.filter((a) => !a.submitted && isDatePast(a.dueDate)).length,
    };
  }, [assignments]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-secondary-900">Assignments</h1>
          <p className="text-secondary-600 mt-2">Track and submit your assignments</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Total</p>
                <p className="text-2xl font-bold text-secondary-800">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-primary-200" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Submitted</p>
                <p className="text-2xl font-bold text-green-600">{stats.submitted}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-200" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-200" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <Calendar className="w-8 h-8 text-red-200" />
            </div>
          </Card>
        </div>

        <Card className="mb-6">
          <CardBody>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-secondary-800 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === 'pending'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-secondary-800 hover:bg-gray-300'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilterStatus('submitted')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === 'submitted'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-secondary-800 hover:bg-gray-300'
                }`}
              >
                Submitted
              </button>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          {sortedAssignments.length > 0 ? (
            sortedAssignments.map((assignment) => {
              const isPast = isDatePast(assignment.dueDate);
              const daysLeft = daysUntil(assignment.dueDate);

              return (
                <Card
                  key={assignment.id}
                  hoverable
                  className="border-l-4"
                  style={{
                    borderLeftColor: assignment.submitted
                      ? '#10b981'
                      : isPast
                      ? '#ef4444'
                      : '#f59e0b',
                  }}
                >
                  <div className="flex items-start justify-between p-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-primary-600" />
                        <p className="font-semibold text-secondary-800">{assignment.title}</p>
                        {assignment.submitted && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded">
                            Submitted
                          </span>
                        )}
                        {isPast && !assignment.submitted && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded">
                            Overdue
                          </span>
                        )}
                      </div>

                      <p className="text-secondary-600">{assignment.description}</p>

                      <div className="flex items-center gap-4 mt-4 text-sm text-secondary-600">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {assignment.courseName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Due: {formatDate(assignment.dueDate)}
                        </span>
                        {!assignment.submitted && (
                          <span
                            className={`font-medium ${
                              isPast
                                ? 'text-red-600'
                                : daysLeft <= 3
                                ? 'text-orange-600'
                                : 'text-green-600'
                            }`}
                          >
                            {isPast ? 'Overdue' : `${daysLeft} days left`}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 text-sm text-secondary-600">
                        {assignment.totalPoints} points
                      </div>
                    </div>

                    <div className="ml-4">
                      <Button
                        variant={assignment.submitted ? 'outline' : 'primary'}
                        size="md"
                        onClick={() => navigate(`/assignments/${assignment.id}`)}
                      >
                        {assignment.submitted ? 'View' : 'Submit'}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
              <p className="text-secondary-600 text-lg">No assignments found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
