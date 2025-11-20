// ...existing code...
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, CheckCircle, Clock, XCircle, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardBody, Button, Modal } from '../../components/common';
import { formatDate } from '../../utils/dateUtils';

// add ErrorBoundary to avoid white screen on runtime/render errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // optionally send to logging service
    console.error('ErrorBoundary caught:', error, info);
  }
  reset = () => this.setState({ hasError: false, error: null });
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-xl w-full bg-white p-6 rounded shadow text-center">
            <h2 className="text-2xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-secondary-600 mb-4">An unexpected error occurred while rendering this page.</p>
            <pre className="text-xs text-left bg-gray-100 p-3 rounded mb-4 overflow-auto" style={{maxHeight: 200}}>
              {String(this.state.error && this.state.error.toString())}
            </pre>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => this.reset()}
                className="px-4 py-2 bg-primary-600 text-white rounded"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AdmissionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Backend API base (backend runs on port 4000). Use Vite env variable VITE_API_URL if set.
  const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

  // applications loaded from backend
  const [applications, setApplications] = useState([]);
  const [showNewApplicationModal, setShowNewApplicationModal] = useState(false);

  // backend availability state
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [backendError, setBackendError] = useState(null);

  // expanded form data to include requested fields + files + nationalId
  const [formData, setFormData] = useState({
    appliedProgram: '',
    gpa: '',
    testScore: '',
    studentName: user?.name || '',
    email: user?.email || '',
    age: '',
    nationalId: '',
    idPhoto: null,
    selfiePhoto: null,
    certificates: [],
  });

  // fetch list from backend (retryable)
  const fetchApplications = async () => {
    try {
      setBackendError(null);
      const res = await fetch(`${API_BASE}/api/applications`);
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Server responded ${res.status} ${txt}`);
      }
      const data = await res.json();
      // normalize upload urls to absolute
      const mapUrl = (v) => (typeof v === 'string' && v.startsWith('/uploads') ? `${API_BASE}${v}` : v);
      const normalized = data.map((a) => ({
        ...a,
        idPhoto: mapUrl(a.idPhoto),
        selfiePhoto: mapUrl(a.selfiePhoto),
        certificates: (a.certificates || []).map((c) => ({ ...c, url: mapUrl(c.url) })),
        documents: (a.documents || []).map((d) => ({ ...d, url: mapUrl(d.url) })),
      }));
      setApplications(normalized);
      setBackendAvailable(true);
      setBackendError(null);
    } catch (err) {
      console.error('fetchApplications error:', err);
      setBackendAvailable(false);
      setBackendError(String(err.message || err));
      setApplications([]); // clear to avoid stale data
    }
  };

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // search / details modal state
  const [searchNationalId, setSearchNationalId] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const userApplications = applications.filter((app) => app.email === user?.email) || [];

  const handleCreateApplication = (e) => {
    e.preventDefault();

    if (!backendAvailable) {
      return alert(`Backend unreachable (${API_BASE}). Start the server (server folder) and retry.`);
    }

    // basic client-side validation
    const required = ['appliedProgram', 'gpa', 'testScore', 'studentName', 'email', 'age', 'nationalId', 'idPhoto', 'selfiePhoto'];
    const missing = required.filter((k) => {
      if (k === 'certificates') return false;
      return !formData[k];
    });
    if (missing.length) {
      alert('Please complete all required fields and uploads: ' + missing.join(', '));
      return;
    }

    // Frontend-specific validations
    if (!/^\d{16}$/.test(String(formData.nationalId))) {
      return alert('National ID must be exactly 16 digits.');
    }
    const score = Number(formData.testScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return alert('Test score must be a number between 0 and 100.');
    }

    // Build FormData and POST to backend
    (async () => {
      try {
        const fd = new FormData();
        fd.append('studentName', formData.studentName);
        fd.append('email', formData.email);
        fd.append('phoneNumber', user?.phone || '');
        fd.append('appliedProgram', formData.appliedProgram);
        fd.append('gpa', formData.gpa);
        fd.append('testScore', formData.testScore);
        fd.append('age', formData.age);
        fd.append('nationalId', formData.nationalId);
        fd.append('submittedAt', new Date().toISOString());
        fd.append('applicationStatus', 'pending');

        if (formData.idPhoto) fd.append('idPhoto', formData.idPhoto);
        if (formData.selfiePhoto) fd.append('selfiePhoto', formData.selfiePhoto);
        (formData.certificates || []).forEach((f) => fd.append('certificates', f));

        const res = await fetch(`${API_BASE}/api/applications`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Failed to create');
        const created = await res.json();
        // normalize URLs
        const mapUrl = (v) => (typeof v === 'string' && v.startsWith('/uploads') ? `${API_BASE}${v}` : v);
        const normalized = {
          ...created,
          idPhoto: mapUrl(created.idPhoto),
          selfiePhoto: mapUrl(created.selfiePhoto),
          certificates: (created.certificates || []).map((c) => ({ ...c, url: mapUrl(c.url) })),
          documents: (created.documents || []).map((d) => ({ ...d, url: mapUrl(d.url) })),
        };
        setApplications((prev) => [normalized, ...prev]);

        // reset form UI
        setFormData({
          appliedProgram: '',
          gpa: '',
          testScore: '',
          studentName: user?.name || '',
          email: user?.email || '',
          age: '',
          nationalId: '',
          idPhoto: null,
          selfiePhoto: null,
          certificates: [],
        });
        setShowNewApplicationModal(false);
      } catch (err) {
        console.error(err);
        alert('Failed to submit application');
      }
    })();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Clock className="w-6 h-6 text-orange-600" />;
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

  // search by national id in existing applications (client-side). If backend search required, replace with API call.
  const handleSearchByNationalId = () => {
    if (!searchNationalId) return alert('Enter a national ID to search');
    const found = applications.find((a) => String(a.nationalId) === String(searchNationalId));
    if (found) {
      setSelectedApplication(found);
      setShowDetailsModal(true);
    } else {
      alert('No application found for that National ID');
    }
  };

  const openDetails = (application) => {
    setSelectedApplication(application);
    setShowDetailsModal(true);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Backend status banner */}
        {!backendAvailable && (
          <div className="max-w-7xl mx-auto px-4 py-3 mb-4 bg-red-50 border border-red-200 rounded text-sm text-red-800 flex items-center justify-between gap-4">
            <div>
              <strong>Backend unreachable:</strong> {backendError || `Cannot connect to ${API_BASE}`}
              <div className="text-xs text-secondary-600 mt-1">Make sure the backend is running: cd server && npm install && npm start</div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => fetchApplications()}>Retry</Button>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-secondary-900">Admission Applications</h1>
              <p className="text-secondary-600 mt-2">Manage your admission applications</p>
            </div>

            <div className="flex items-center gap-3">
              {/* National ID quick search */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search by National ID"
                  value={searchNationalId}
                  onChange={(e) => setSearchNationalId(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
                <Button variant="outline" onClick={handleSearchByNationalId} className="flex items-center gap-2">
                  <Search className="w-4 h-4" /> Search
                </Button>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowNewApplicationModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Application
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-600 text-sm">Total Applications</p>
                  <p className="text-3xl font-bold text-secondary-800">{userApplications.length}</p>
                </div>
                <FileText className="w-8 h-8 text-primary-200" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-600 text-sm">Approved</p>
                  <p className="text-3xl font-bold text-green-600">
                    {userApplications.filter((a) => a.applicationStatus === 'approved').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-200" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-600 text-sm">Pending</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {userApplications.filter((a) => a.applicationStatus === 'pending').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-200" />
              </div>
            </Card>
          </div>

          {userApplications.length > 0 ? (
            <div className="space-y-4">
              {userApplications.map((application) => (
                <Card key={application.id} hoverable>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(application.applicationStatus)}
                        <h3 className="text-lg font-bold text-secondary-800">
                          {application.appliedProgram}
                        </h3>
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(
                            application.applicationStatus
                          )}`}
                        >
                          {application.applicationStatus.charAt(0).toUpperCase() +
                            application.applicationStatus.slice(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs font-semibold text-secondary-600 uppercase">GPA</p>
                          <p className="text-lg font-bold text-secondary-800">{application.gpa}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-secondary-600 uppercase">Test Score</p>
                          <p className="text-lg font-bold text-secondary-800">{application.testScore}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-secondary-600 uppercase">Submitted</p>
                          <p className="text-sm text-secondary-800">{formatDate(application.submittedAt)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-secondary-600 uppercase">Documents</p>
                          <p className="text-sm text-secondary-800">{application.documents?.length || application.certificates?.length || 0} files</p>
                        </div>
                      </div>

                      {application.rejectionReason && (
                        <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-sm font-semibold text-red-900 mb-1">Rejection Reason:</p>
                          <p className="text-sm text-red-800">{application.rejectionReason}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => openDetails(application)}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="md"
                        onClick={() => navigate(`/admission/applications/${application.id}`)}
                      >
                        Open Page
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                <p className="text-secondary-600 text-lg">No applications yet</p>
                <p className="text-secondary-500 mb-4">Create your first admission application to get started</p>
                <Button
                  variant="primary"
                  onClick={() => setShowNewApplicationModal(true)}
                >
                  Create Application
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* New Application Modal */}
        <Modal
          isOpen={showNewApplicationModal}
          onClose={() => setShowNewApplicationModal(false)}
          title="New Admission Application"
        >
          <form onSubmit={handleCreateApplication} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Program to Apply For <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.appliedProgram}
                onChange={(e) => setFormData({ ...formData, appliedProgram: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select a program</option>
                <option value="Bachelor of Science in Computer Science">
                  Bachelor of Science in Computer Science
                </option>
                <option value="Bachelor of Science in Business Administration">
                  Bachelor of Science in Business Administration
                </option>
                <option value="Master of Engineering">Master of Engineering</option>
                <option value="Bachelor of Arts in English">Bachelor of Arts in English</option>
                <option value="Bachelor of Science in Biology">Bachelor of Science in Biology</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  GPA <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  value={formData.gpa}
                  onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Test Score <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={formData.testScore}
                onChange={(e) => setFormData({ ...formData, testScore: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  National ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nationalId}
                  onChange={(e) => setFormData({ ...formData, nationalId: e.target.value.replace(/\D/g,'').slice(0,16) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Photo of ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFormData({ ...formData, idPhoto: e.target.files[0] || null })}
                  className="w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Photo of Yourself (Selfie) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, selfiePhoto: e.target.files[0] || null })}
                  className="w-full"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Certificates (photos, multiple)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={(e) =>
                  setFormData({ ...formData, certificates: Array.from(e.target.files || []) })
                }
                className="w-full"
              />
            </div>

            <Button variant="primary" className="w-full">
              Submit Application
            </Button>
          </form>
        </Modal>

        {/* Details Modal (shows photos and documents) */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => { setShowDetailsModal(false); setSelectedApplication(null); }}
          title="Application Details"
        >
          {selectedApplication ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedApplication.studentName || selectedApplication.email}</h3>
                <p className="text-sm text-secondary-600">Program: {selectedApplication.appliedProgram}</p>
                <p className="text-sm text-secondary-600">Submitted: {formatDate(selectedApplication.submittedAt)}</p>
                <p className="text-sm text-secondary-600">Status: {selectedApplication.applicationStatus}</p>
                <p className="text-sm text-secondary-600">National ID: {selectedApplication.nationalId || '—'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Selfie / Applicant Photo</h4>
                  {selectedApplication.selfiePhoto ? (
                    // if selfiePhoto is a URL string
                    typeof selectedApplication.selfiePhoto === 'string' ? (
                      <img src={selectedApplication.selfiePhoto} alt="selfie" className="max-w-full rounded-lg" />
                    ) : (
                      // if object (e.g. File-like) show name
                      <p className="text-sm">{selectedApplication.selfiePhoto.name || 'Uploaded file'}</p>
                    )
                  ) : (
                    <p className="text-sm text-secondary-500">No selfie available</p>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold mb-2">ID Photo</h4>
                  {selectedApplication.idPhoto ? (
                    typeof selectedApplication.idPhoto === 'string' ? (
                      <img src={selectedApplication.idPhoto} alt="id" className="max-w-full rounded-lg" />
                    ) : (
                      <p className="text-sm">{selectedApplication.idPhoto.name || 'Uploaded file'}</p>
                    )
                  ) : (
                    <p className="text-sm text-secondary-500">No ID photo available</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Certificates</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(selectedApplication.certificates && selectedApplication.certificates.length > 0) ? (
                    selectedApplication.certificates.map((c, i) => (
                      <div key={i} className="p-2 border rounded">
                        {typeof c === 'string' ? (
                          // if archived URL
                          <a href={c} target="_blank" rel="noreferrer" className="text-primary-600 underline">{c.split('/').pop()}</a>
                        ) : (
                          <p className="text-sm">{c.name || 'Uploaded file'}</p>
                        )}
                      </div>
                    ))
                  ) : (selectedApplication.documents && selectedApplication.documents.length > 0) ? (
                    selectedApplication.documents.map((d, i) => (
                      <div key={i} className="p-2 border rounded">
                        {d.url ? (
                          <a href={d.url} target="_blank" rel="noreferrer" className="text-primary-600 underline">{d.originalName || d.filename}</a>
                        ) : (
                          <p className="text-sm">{d.originalName || d.filename || 'Document'}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-secondary-500">No certificates uploaded</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p>No application selected</p>
          )}
        </Modal>
      </div>
    </ErrorBoundary>
  );
};