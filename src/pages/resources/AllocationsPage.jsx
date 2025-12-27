import React, { useState, useEffect } from 'react';
import { Package, User, CalendarDays, CheckCircle, XCircle, Search, RotateCcw } from 'lucide-react';
import { useResources } from '../../context/ResourcesContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardBody, Button, FormInput, FormSelect, Modal, FormTextarea } from '../../components/common';

const statusBadge = (status) => {
  switch (status) {
    case 'allocated':
      return 'bg-blue-100 text-blue-700';
    case 'returned':
      return 'bg-green-100 text-green-700';
    case 'overdue':
      return 'bg-red-100 text-red-700';
    case 'maintenance':
      return 'bg-yellow-100 text-yellow-700';
    case 'lost':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export const AllocationsPage = () => {
  const { user } = useAuth();
  const { resources, allocations, createAllocation, returnAllocation, fetchResources, fetchAllocations } = useResources();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [allocateForm, setAllocateForm] = useState({
    resourceId: '',
    allocatedToUserId: '',
    allocatedToDepartment: '',
    dueBack: '',
    notes: '',
  });

  // Fetch allocations on mount and periodically
  useEffect(() => {
    fetchAllocations();
    fetchResources();

    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchAllocations();
      fetchResources();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchAllocations, fetchResources]);

  // Filter allocations
  const filteredAllocations = allocations.filter(a => {
    const matchesSearch = a.resource_name?.toLowerCase().includes(search.toLowerCase()) ||
                         a.asset_tag?.toLowerCase().includes(search.toLowerCase()) ||
                         a.allocated_to_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get available resources for allocation
  const availableResources = resources.filter(r => r.status === 'available');

  const handleAllocateClick = () => {
    setShowAllocateModal(true);
    setError(null);
    setSuccess(null);
    setAllocateForm({
      resourceId: '',
      allocatedToUserId: '',
      allocatedToDepartment: '',
      dueBack: '',
      notes: '',
    });
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const data = {
        resourceId: parseInt(allocateForm.resourceId),
        allocatedToUserId: allocateForm.allocatedToUserId ? parseInt(allocateForm.allocatedToUserId) : null,
        allocatedToDepartment: allocateForm.allocatedToDepartment || '',
        allocatedBy: user.id || user._id,
        dueBack: allocateForm.dueBack ? new Date(allocateForm.dueBack).toISOString() : null,
        notes: allocateForm.notes || '',
      };

      await createAllocation(data);
      setSuccess('Resource allocated successfully!');
      setTimeout(() => {
        setShowAllocateModal(false);
        setSuccess(null);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to allocate resource');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnClick = async (allocationId) => {
    if (!confirm('Are you sure you want to mark this resource as returned?')) return;

    setLoading(true);
    setError(null);

    try {
      await returnAllocation(allocationId);
      setSuccess('Resource returned successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to return resource');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-secondary-900">Resource Allocations</h1>
            <p className="text-secondary-600 mt-2">Manage resource allocations and returns</p>
          </div>
          <Button variant="primary" className="flex items-center gap-2" onClick={handleAllocateClick}>
            <Package className="w-4 h-4" />
            Allocate Resource
          </Button>
        </div>

        {(error || success) && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {error ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
              <span className="font-medium">{error || success}</span>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Search allocations"
                name="search"
                type="text"
                placeholder="Search by resource name, asset tag, or user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <FormSelect
                label="Filter by status"
                name="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { label: 'All', value: 'all' },
                  { label: 'Allocated', value: 'allocated' },
                  { label: 'Returned', value: 'returned' },
                  { label: 'Overdue', value: 'overdue' },
                  { label: 'Maintenance', value: 'maintenance' },
                ]}
              />
            </div>
          </CardBody>
        </Card>

        {/* Allocations List */}
        {filteredAllocations.length > 0 ? (
          <div className="space-y-4">
            {filteredAllocations.map((allocation) => (
              <Card key={allocation.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary-600" />
                        <h3 className="text-lg font-bold text-secondary-800">{allocation.resource_name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusBadge(allocation.status)}`}>
                          {allocation.status}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-secondary-600">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Asset Tag:</span> {allocation.asset_tag || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span className="font-medium">Allocated to:</span> {allocation.allocated_to_name || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4" />
                          <span className="font-medium">Allocated:</span>{' '}
                          {new Date(allocation.allocated_at).toLocaleDateString()}
                        </div>
                        {allocation.due_back && (
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4" />
                            <span className="font-medium">Due:</span>{' '}
                            {new Date(allocation.due_back).toLocaleDateString()}
                          </div>
                        )}
                        {allocation.allocated_to_department && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Department:</span> {allocation.allocated_to_department}
                          </div>
                        )}
                      </div>
                      {allocation.notes && (
                        <p className="mt-2 text-sm text-secondary-600 italic">
                          Notes: {allocation.notes}
                        </p>
                      )}
                    </div>
                    {allocation.status === 'allocated' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-50"
                        onClick={() => handleReturnClick(allocation.id)}
                        disabled={loading}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Mark Returned
                      </Button>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
              <p className="text-secondary-600 text-lg">
                {search || statusFilter !== 'all' ? 'No allocations match your filters' : 'No allocations found'}
              </p>
            </div>
          </Card>
        )}

        {/* Allocate Modal */}
        <Modal
          isOpen={showAllocateModal}
          onClose={() => setShowAllocateModal(false)}
          title="Allocate Resource"
          size="lg"
        >
          <form onSubmit={handleAllocateSubmit} className="space-y-4">
            <FormSelect
              label="Resource"
              name="resourceId"
              value={allocateForm.resourceId}
              onChange={(e) => setAllocateForm((p) => ({ ...p, resourceId: e.target.value }))}
              options={[
                { label: 'Select a resource...', value: '' },
                ...availableResources.map((r) => ({
                  label: `${r.name} (${r.asset_tag || 'No tag'})`,
                  value: r.id,
                })),
              ]}
              required
            />
            <FormInput
              label="User ID"
              name="allocatedToUserId"
              type="number"
              placeholder="Enter user ID to allocate to"
              value={allocateForm.allocatedToUserId}
              onChange={(e) => setAllocateForm((p) => ({ ...p, allocatedToUserId: e.target.value }))}
              required
            />
            <FormInput
              label="Department"
              name="allocatedToDepartment"
              type="text"
              placeholder="e.g., Computer Science"
              value={allocateForm.allocatedToDepartment}
              onChange={(e) => setAllocateForm((p) => ({ ...p, allocatedToDepartment: e.target.value }))}
            />
            <FormInput
              label="Due Back Date"
              name="dueBack"
              type="date"
              value={allocateForm.dueBack}
              onChange={(e) => setAllocateForm((p) => ({ ...p, dueBack: e.target.value }))}
            />
            <FormTextarea
              label="Notes (optional)"
              name="notes"
              rows={3}
              placeholder="Any additional notes..."
              value={allocateForm.notes}
              onChange={(e) => setAllocateForm((p) => ({ ...p, notes: e.target.value }))}
            />
            <Button variant="primary" className="w-full" type="submit" disabled={loading}>
              {loading ? 'Allocating...' : 'Allocate Resource'}
            </Button>
          </form>
        </Modal>
      </div>
    </div>
  );
};
