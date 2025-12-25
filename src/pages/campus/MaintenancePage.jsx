import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, MapPin, AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardBody, Button, FormInput, FormTextarea, FormSelect } from '../../components/common';
import { formatDate } from '../../utils/dateUtils';

const statusBadge = (status) => {
  switch (status) {
    case 'resolved':
      return 'bg-green-100 text-green-700';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-yellow-100 text-yellow-700';
  }
};

export const MaintenancePage = () => {
  const { userRole } = useAuth();
  const { reportMaintenanceIssue, myMaintenanceIssues } = useCampus();

  const [form, setForm] = useState({
    location: '',
    category: 'General',
    priority: 'medium',
    description: '',
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const sorted = useMemo(
    () => [...myMaintenanceIssues].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [myMaintenanceIssues]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      reportMaintenanceIssue({
        location: form.location,
        category: form.category,
        description: form.description,
        priority: form.priority,
      });
      setSuccess('Issue reported successfully.');
      setForm({ location: '', category: 'General', priority: 'medium', description: '' });
    } catch (err) {
      setError(err?.message || 'Failed to report issue');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-secondary-900">Maintenance</h1>
            <p className="text-secondary-600 mt-2">Report issues around campus and track status</p>
          </div>
          {(userRole === 'admin' || userRole === 'staff') && (
            <Link to="/admin/maintenance" className="text-primary-600 hover:text-primary-700 font-medium">
              Manage Issues →
            </Link>
          )}
        </div>

        {(error || success) && (
          <div
            className={`mb-6 p-3 rounded-lg border ${
              error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {error ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              <span className="font-medium">{error || success}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <h2 className="text-lg font-bold text-secondary-800">Report an Issue</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput
                  label="Location"
                  name="location"
                  placeholder="e.g., Library - 2nd floor"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  required
                />

                <FormSelect
                  label="Category"
                  name="category"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  options={[
                    { label: 'General', value: 'General' },
                    { label: 'Electrical', value: 'Electrical' },
                    { label: 'Plumbing', value: 'Plumbing' },
                    { label: 'HVAC', value: 'HVAC' },
                    { label: 'IT / Network', value: 'IT / Network' },
                  ]}
                />

                <FormSelect
                  label="Priority"
                  name="priority"
                  value={form.priority}
                  onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                  options={[
                    { label: 'Low', value: 'low' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'High', value: 'high' },
                  ]}
                />

                <FormTextarea
                  label="Description"
                  name="description"
                  rows={5}
                  placeholder="Describe the issue..."
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  required
                />

                <Button variant="primary" className="w-full">
                  Submit
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="text-lg font-bold text-secondary-800">My Reports</h2>
            </CardHeader>
            <CardBody>
              {sorted.length > 0 ? (
                <div className="space-y-4">
                  {sorted.map((i) => (
                    <div key={i.id} className="p-4 rounded-lg bg-gray-50 border">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Wrench className="w-5 h-5 text-primary-600" />
                            <p className="font-semibold text-secondary-800">{i.category}</p>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusBadge(i.status)}`}>
                              {i.status}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                i.priority === 'high'
                                  ? 'bg-red-100 text-red-700'
                                  : i.priority === 'low'
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {i.priority}
                            </span>
                          </div>
                          <div className="mt-2 text-sm text-secondary-600 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {i.location}
                          </div>
                          <p className="text-secondary-700 mt-3 whitespace-pre-wrap">{i.description}</p>
                          <p className="text-xs text-secondary-500 mt-2">Submitted: {formatDate(i.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ClipboardList className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                  <p className="text-secondary-600 text-lg">No reports yet</p>
                  <p className="text-secondary-500">Submit a report and it will appear here</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
