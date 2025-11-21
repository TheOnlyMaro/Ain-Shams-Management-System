import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Eye, FileText } from 'lucide-react';
// removed: import { useAdmission } from '../../context/AdmissionContext';
import { Card, CardHeader, CardBody, Button, Modal } from '../../components/common';
import { formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';

export const AdminApplicationsPage = () => {
  const navigate = useNavigate();
  // Backend URL (Vite env)
  const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

  // applications loaded from backend
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // authentication (access token provided by AuthContext)
  const { authToken, user, isAuthenticated } = useAuth();

  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedAppDetails, setSelectedAppDetails] = useState(null); // {full application}
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({ status: 'approved', feedback: '' });

  // no local staff-token handling here; backend expects Authorization: Bearer <token>

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/applications`);
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = await res.json();
      setApplications(data);
    } catch (err) {
      console.error(err);
      setError(String(err.message || err));
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (filterStatus === 'all') return true;
      return app.applicationStatus === filterStatus;
    });
  }, [applications, filterStatus]);

  const fetchApplicationDetails = async (appId) => {
    setLoadingDetails(true);
    setSelectedAppDetails(null);
    try {
      const res = await fetch(`${API_BASE}/api/applications/${encodeURIComponent(appId)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Failed to load (${res.status})`);
      }
      const data = await res.json();
      setSelectedAppDetails(data);
      return data;
    } catch (err) {
      console.error('fetchApplicationDetails error', err);
      alert('Failed to load application details: ' + (err.message || err));
      return null;
    } finally {
      setLoadingDetails(false);
    }
  };

  // open review: fetch details then show modal
  const openReview = async (application) => {
    setSelectedApp(application);
    const details = await fetchApplicationDetails(application.id);
    if (details) {
      // initialize decision to current application status so reviewer can change it
      setReviewData({
        status: details.applicationStatus || 'pending',
        feedback: '',
      });
      setShowReviewModal(true);
    } else {
      // clear selection if failed
      setSelectedApp(null);
      setSelectedAppDetails(null);
    }
  };

  const handleUpdateStatus = async () => {
    const appId = selectedAppDetails?.nationalId || selectedApp?.id;
    if (!appId) return alert('No application selected');

    // require user to be signed in and have an access token
    if (!authToken) {
      // redirect to login page or prompt
      const go = window.confirm('You must be signed in to submit a review. Go to login page now?');
      if (go) return navigate('/auth/login');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/applications/${encodeURIComponent(appId)}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: reviewData.status, note: reviewData.feedback }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || `Failed (${res.status})`);
      }
      alert('Status updated');
      setShowReviewModal(false);
      setSelectedApp(null);
      setSelectedAppDetails(null);
      setReviewData({ status: 'approved', feedback: '' });
      await fetchApplications();
    } catch (err) {
      console.error('handleUpdateStatus error', err);
      alert('Update failed: ' + (err.message || err));
    } finally {
      setSubmitting(false);
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

        {/* Staff credentials */}
        <Card className="mb-4">
          <CardBody>
            <div className="flex gap-2 items-center">
              <input
                placeholder="Staff ID"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="px-3 py-2 border rounded"
              />
              <input
                placeholder="Staff Token"
                value={staffToken}
                onChange={(e) => setStaffToken(e.target.value)}
                className="px-3 py-2 border rounded"
                type="password"
              />
              <Button variant="outline" onClick={() => fetchApplications()}>
                Refresh
              </Button>
              {loading && <div className="text-sm text-secondary-600 ml-3">Loading...</div>}
              {error && <div className="text-sm text-red-600 ml-3">Error: {error}</div>}
            </div>
          </CardBody>
        </Card>

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
                          onClick={() => openReview(application)}
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
        onClose={() => { setShowReviewModal(false); setSelectedApp(null); setSelectedAppDetails(null); }}
        title={`Review Application - ${selectedAppDetails?.studentName || selectedApp?.studentName || ''}`}
      >
        <div className="space-y-4">
          {/* Application details section */}
          {loadingDetails ? (
            <div className="py-6 text-center">Loading application details...</div>
          ) : selectedAppDetails ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded">
                <h4 className="font-semibold mb-2">Applicant Info</h4>
                <p><strong>Name:</strong> {selectedAppDetails.studentName}</p>
                <p><strong>Email:</strong> {selectedAppDetails.email || '—'}</p>
                <p><strong>Phone:</strong> {selectedAppDetails.phoneNumber || '—'}</p>
                <p><strong>National ID:</strong> {selectedAppDetails.nationalId || '—'}</p>
                <p><strong>Age:</strong> {selectedAppDetails.age ?? '—'}</p>
                <p><strong>Program:</strong> {selectedAppDetails.appliedProgram || '—'}</p>
                <p><strong>GPA:</strong> {selectedAppDetails.gpa ?? '—'}</p>
                <p><strong>Test Score:</strong> {selectedAppDetails.testScore ?? '—'}</p>
                <p><strong>Submitted:</strong> {formatDate(selectedAppDetails.submittedAt)}</p>
              </div>

              <div className="p-4 border rounded">
                <h4 className="font-semibold mb-2">Documents</h4>

                <div className="mb-3">
                  <p className="font-semibold">Selfie / Applicant Photo</p>
                  {selectedAppDetails.selfiePhoto ? (
                    typeof selectedAppDetails.selfiePhoto === 'string' ? (
                      <img src={selectedAppDetails.selfiePhoto} alt="selfie" className="max-w-full rounded mb-2" />
                    ) : <p className="text-sm">{selectedAppDetails.selfiePhoto.name || 'Uploaded file'}</p>
                  ) : <p className="text-sm text-secondary-500">No selfie available</p>}
                </div>

                <div className="mb-3">
                  <p className="font-semibold">ID Photo</p>
                  {selectedAppDetails.idPhoto ? (
                    typeof selectedAppDetails.idPhoto === 'string' ? (
                      <img src={selectedAppDetails.idPhoto} alt="id" className="max-w-full rounded mb-2" />
                    ) : <p className="text-sm">{selectedAppDetails.idPhoto.name || 'Uploaded file'}</p>
                  ) : <p className="text-sm text-secondary-500">No ID photo available</p>}
                </div>

                <div>
                  <p className="font-semibold mb-2">Certificates</p>
                  <div className="grid grid-cols-1 gap-2">
                    {(selectedAppDetails.certificates && selectedAppDetails.certificates.length > 0) ? (
                      selectedAppDetails.certificates.map((c, i) => (
                        <div key={i} className="p-2 border rounded">
                          {c.url ? (
                            <a href={c.url} target="_blank" rel="noreferrer" className="text-primary-600 underline">
                              {c.originalName || c.filename || c.url.split('/').pop()}
                            </a>
                          ) : (
                            <p className="text-sm">{c.originalName || c.filename || c.name || 'Uploaded file'}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-secondary-500">No certificates uploaded</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Activity logs if available */}
              <div className="md:col-span-2 p-4 border rounded">
                <h4 className="font-semibold mb-2">Activity Log</h4>
                {(selectedAppDetails.activityLogs && selectedAppDetails.activityLogs.length > 0) ? (
                  <ul className="space-y-2 text-sm">
                    {selectedAppDetails.activityLogs.map((a, idx) => (
                      <li key={idx} className="p-2 bg-gray-50 rounded">
                        <div><strong>{a.staffId || a.staff || 'staff'}</strong> — <span className="text-secondary-600">{a.action}</span></div>
                        <div className="text-xs text-secondary-600">{a.note || a.message || ''}</div>
                        <div className="text-xs text-secondary-500">{new Date(a.timestamp || a.sentAt || a.date || Date.now()).toLocaleString()}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-secondary-500">No activity recorded</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-secondary-500">No details to show</p>
          )}

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
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
