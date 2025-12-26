import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Wrench, MapPin, User, Save } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { Card, CardHeader, CardBody, Button, FormSelect, FormTextarea } from '../../components/common';
import { formatDate } from '../../utils/dateUtils';

// Sub-component to handle individual issue updates with local state
const MaintenanceIssueCard = ({ issue, onUpdate }) => {
  const [status, setStatus] = useState(issue.status);
  const [notes, setNotes] = useState(issue.resolutionNotes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(issue.id, {
        status,
        resolutionNotes: notes,
        updatedAt: new Date().toISOString()
      });
      // Optional: show a toast or feedback here
    } catch (error) {
      console.error("Failed to save", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-secondary-800">{issue.category}</h2>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">
                {issue.status}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">
                priority: {issue.priority}
              </span>
            </div>
            <div className="mt-2 text-sm text-secondary-600 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {issue.location}
            </div>
            <div className="mt-2 text-sm text-secondary-600 flex items-center gap-2">
              <User className="w-4 h-4" />
              {issue.reportedBy?.name || 'User'} ({issue.reportedBy?.role || 'role'})
            </div>
            <p className="text-secondary-700 mt-3 whitespace-pre-wrap">{issue.description}</p>
            <p className="text-xs text-secondary-500 mt-2">Submitted: {formatDate(issue.createdAt)}</p>
          </div>

          <div className="min-w-[220px]">
            <FormSelect
              label="Update status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { label: 'Reported', value: 'reported' },
                { label: 'In progress', value: 'in_progress' },
                { label: 'Resolved', value: 'resolved' },
              ]}
            />
          </div>
        </div>
      </CardHeader>

      <CardBody>
        <FormTextarea
          label="Resolution Notes"
          name="note"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes for handling this issue..."
        />

        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

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
                  { label: 'Reported', value: 'reported' },
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
              <MaintenanceIssueCard
                key={i.id}
                issue={i}
                onUpdate={updateMaintenanceIssue}
              />
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
