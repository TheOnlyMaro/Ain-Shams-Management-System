import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Wrench, MapPin, User, Save } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { Card, CardHeader, CardBody, Button, FormSelect, FormTextarea } from '../../components/common';
import { formatDate } from '../../utils/dateUtils';

export const AdminMaintenancePage = () => {
  const { maintenanceIssues, updateMaintenanceIssue } = useCampus();
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = useMemo(() => {
    const list = filterStatus === 'all' ? maintenanceIssues : maintenanceIssues.filter((i) => i.status === filterStatus);
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [maintenanceIssues, filterStatus]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-secondary-900">Maintenance Management</h1>
            <p className="text-secondary-600 mt-2">Update status and track reported issues</p>
          </div>
          <Link to="/maintenance" className="text-primary-600 hover:text-primary-700 font-medium">
            Back to Reporting →
          </Link>
        </div>

        <Card className="mb-6">
          <CardBody>
            <div className="max-w-[260px]">
              <FormSelect
                label="Filter by status"
                name="status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value || 'all')}
                options={[
                  { label: 'All', value: 'all' },
                  { label: 'Submitted', value: 'submitted' },
                  { label: 'In progress', value: 'in_progress' },
                  { label: 'Resolved', value: 'resolved' },
                ]}
              />
            </div>
          </CardBody>
        </Card>

        {filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((i) => (
              <Card key={i.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-primary-600" />
                        <h2 className="text-lg font-bold text-secondary-800">{i.category}</h2>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">
                          {i.status}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">
                          priority: {i.priority}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-secondary-600 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {i.location}
                      </div>
                      <div className="mt-2 text-sm text-secondary-600 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {i.reportedBy?.name || 'User'} ({i.reportedBy?.role || 'role'})
                      </div>
                      <p className="text-secondary-700 mt-3 whitespace-pre-wrap">{i.description}</p>
                      <p className="text-xs text-secondary-500 mt-2">Submitted: {formatDate(i.createdAt)}</p>
                    </div>

                    <div className="min-w-[220px]">
                      <FormSelect
                        label="Update status"
                        name="status"
                        value={i.status}
                        onChange={(e) => updateMaintenanceIssue(i.id, { status: e.target.value })}
                        options={[
                          { label: 'Submitted', value: 'submitted' },
                          { label: 'In progress', value: 'in_progress' },
                          { label: 'Resolved', value: 'resolved' },
                        ]}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardBody>
                  <FormTextarea
                    label="Internal note (stored on this device only)"
                    name="note"
                    rows={3}
                    value={i.internalNote || ''}
                    onChange={(e) => updateMaintenanceIssue(i.id, { internalNote: e.target.value })}
                    placeholder="Add notes for handling this issue..."
                  />

                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => updateMaintenanceIssue(i.id, { updatedAt: new Date().toISOString() })}
                    >
                      <Save className="w-4 h-4" />
                      Save
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
              <p className="text-secondary-600 text-lg">No issues found</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
