import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Eye, FileText } from 'lucide-react';
import { useAdmission } from '../../context/AdmissionContext';
import { Card, CardHeader, CardBody, Button, Modal } from '../../components/common';
import { formatDate } from '../../utils/dateUtils';

export const AdminApplicationsPage = () => {
  const navigate = useNavigate();
  const { applications, updateApplicationStatus } = useAdmission();
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({ status: 'approved', feedback: '' });

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (filterStatus === 'all') return true;
      return app.applicationStatus === filterStatus;
    });
  }, [applications, filterStatus]);

  const handleUpdateStatus = () => {
    if (selectedApp) {
      updateApplicationStatus(selectedApp.id, reviewData.status, {
        feedback: reviewData.feedback,
      });
      setShowReviewModal(false);
      setSelectedApp(null);
      setReviewData({ status: 'approved', feedback: '' });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-orange-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const stats = useMemo(() => {
    return {
      total: applications.length,
      pending: applications.filter((a) => a.applicationStatus === 'pending').length,
      approved: applications.filter((a) => a.applicationStatus === 'approved').length,
      rejected: applications.filter((a) => a.applicationStatus === 'rejected').length,
    };
  }, [applications]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-secondary-900">Application Management</h1>
          <p className="text-secondary-600 mt-2">Review and manage admission applications</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Total Applications</p>
                <p className="text-3xl font-bold text-secondary-800">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-primary-200" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Pending Review</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-200" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Approved</p>
                <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-200" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Rejected</p>
                <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-200" />
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
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === 'pending'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-secondary-800 hover:bg-gray-300'
                }`}
              >
                Pending ({stats.pending})
              </button>
              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === 'approved'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-secondary-800 hover:bg-gray-300'
                }`}
              >
                Approved ({stats.approved})
              </button>
              <button
                onClick={() => setFilterStatus('rejected')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === 'rejected'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-secondary-800 hover:bg-gray-300'
                }`}
              >
                Rejected ({stats.rejected})
              </button>
            </div>
          </CardBody>
        </Card>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-secondary-800">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-secondary-800">Program</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-secondary-800">GPA</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-secondary-800">Test Score</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-secondary-800">Submitted</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-secondary-800">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-secondary-800">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map((application) => (
                <tr
                  key={application.id}
                  className="border-b border-gray-200 hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3 text-sm text-secondary-800 font-medium">
                    {application.studentName}
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary-600">
                    {application.appliedProgram}
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary-800 font-medium">
                    {application.gpa}
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary-800 font-medium">
                    {application.testScore}
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary-600">
                    {formatDate(application.submittedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(application.applicationStatus)}
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(
                          application.applicationStatus
                        )}`}
                      >
                        {application.applicationStatus.charAt(0).toUpperCase() +
                          application.applicationStatus.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => navigate(`/admin/applications/${application.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                      {application.applicationStatus === 'pending' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedApp(application);
                            setShowReviewModal(true);
                          }}
                        >
                          Review
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredApplications.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
              <p className="text-secondary-600 text-lg">No applications found</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={`Review Application - ${selectedApp?.studentName}`}
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-secondary-700 mb-2">Current Status</p>
            <p className="text-secondary-800">{selectedApp?.applicationStatus}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Decision</label>
            <select
              value={reviewData.status}
              onChange={(e) => setReviewData({ ...reviewData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="approved">Approve</option>
              <option value="rejected">Reject</option>
              <option value="pending">Keep Pending</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Feedback</label>
            <textarea
              value={reviewData.feedback}
              onChange={(e) => setReviewData({ ...reviewData, feedback: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={4}
              placeholder="Enter your feedback or rejection reason"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowReviewModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleUpdateStatus}
            >
              Submit Review
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
