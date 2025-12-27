import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, Search, User, CalendarDays, AlertCircle, CheckCircle } from 'lucide-react';
import { useResources } from '../../context/ResourcesContext';
import { Card, CardHeader, CardBody, Button, FormInput, FormSelect, FormTextarea, Modal } from '../../components/common';

const statusBadge = (status) => {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-700';
    case 'allocated':
      return 'bg-blue-100 text-blue-700';
    case 'maintenance':
      return 'bg-yellow-100 text-yellow-700';
    case 'retired':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export const ManageResourcesPage = () => {
  const { resources, resourceTypes, createResource, updateResource, deleteResource, fetchResourceTypes } = useResources();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch resource types on mount
  useEffect(() => {
    if (resourceTypes.length === 0) {
      fetchResourceTypes();
    }
  }, [fetchResourceTypes, resourceTypes.length]);

  // Filter resources
  const filteredResources = resources.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
                         r.asset_tag.toLowerCase().includes(search.toLowerCase()) ||
                         r.serial_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateClick = () => {
    setShowCreateModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleEditClick = (resource) => {
    setSelectedResource(resource);
    setShowEditModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleDeleteClick = (resource) => {
    setSelectedResource(resource);
    setShowDeleteConfirm(true);
    setError(null);
    setSuccess(null);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.target);
      const data = {
        name: formData.get('name'),
        resourceTypeId: formData.get('resourceTypeId') ? parseInt(formData.get('resourceTypeId')) : null,
        assetTag: formData.get('assetTag') || '',
        serialNumber: formData.get('serialNumber') || '',
        department: formData.get('department') || '',
        location: formData.get('location') || '',
        status: formData.get('status') || 'available',
        isSoftware: formData.get('isSoftware') === 'true',
      };
      await createResource(data);
      setSuccess('Resource created successfully!');
      setTimeout(() => {
        setShowCreateModal(false);
        setSuccess(null);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create resource');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResource) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.target);
      const data = {
        name: formData.get('name'),
        resourceTypeId: formData.get('resourceTypeId') ? parseInt(formData.get('resourceTypeId')) : null,
        assetTag: formData.get('assetTag') || '',
        serialNumber: formData.get('serialNumber') || '',
        department: formData.get('department') || '',
        location: formData.get('location') || '',
        status: formData.get('status') || 'available',
        isSoftware: formData.get('isSoftware') === 'true',
      };
      await updateResource(selectedResource.id, data);
      setSuccess('Resource updated successfully!');
      setTimeout(() => {
        setShowEditModal(false);
        setSelectedResource(null);
        setSuccess(null);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update resource');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedResource) return;

    setLoading(true);
    setError(null);

    try {
      await deleteResource(selectedResource.id);
      setSuccess('Resource deleted successfully!');
      setTimeout(() => {
        setShowDeleteConfirm(false);
        setSelectedResource(null);
        setSuccess(null);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete resource');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-secondary-900">Manage Resources</h1>
            <p className="text-secondary-600 mt-2">Add, edit, and remove resources</p>
          </div>
          <Button variant="primary" className="flex items-center gap-2" onClick={handleCreateClick}>
            <Plus className="w-4 h-4" />
            Add Resource
          </Button>
        </div>

        {(error || success) && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {error ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
              <span className="font-medium">{error || success}</span>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Search resources"
                name="search"
                type="text"
                placeholder="Search by name, asset tag, or serial number..."
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
                  { label: 'Available', value: 'available' },
                  { label: 'Allocated', value: 'allocated' },
                  { label: 'Maintenance', value: 'maintenance' },
                  { label: 'Retired', value: 'retired' },
                ]}
              />
            </div>
          </CardBody>
        </Card>

        {/* Resources List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredResources.map((resource) => (
            <Card key={resource.id}>
              <CardHeader className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary-600" />
                    <h3 className="text-lg font-bold text-secondary-800">{resource.name}</h3>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-secondary-600">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Asset Tag:</span> {resource.asset_tag || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Serial:</span> {resource.serial_number || 'N/A'}
                    </div>
                    {resource.location && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Location:</span> {resource.location}
                      </div>
                    )}
                    {resource.department && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Department:</span> {resource.department}
                      </div>
                    )}
                    {resource.resource_type_name && (
                      <div className="mt-2">
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                          {resource.resource_type_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusBadge(resource.status)}`}>
                  {resource.status}
                </span>
              </CardHeader>
              <CardBody>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditClick(resource)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteClick(resource)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        {filteredResources.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
              <p className="text-secondary-600 text-lg">
                {search || statusFilter !== 'all' ? 'No resources match your filters' : 'No resources found. Add your first resource!'}
              </p>
            </div>
          </Card>
        )}

        {/* Create Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Add New Resource"
          size="lg"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <FormInput
              label="Name"
              name="name"
              type="text"
 placeholder="e.g., MacBook Pro 14&quot;"
              required
            />
            <FormSelect
              label="Resource Type"
              name="resourceTypeId"
              options={[
                { label: 'None', value: '' },
                ...resourceTypes.map((rt) => ({ label: rt.name, value: rt.id }))
              ]}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Asset Tag"
                name="assetTag"
                type="text"
                placeholder="e.g., AST-001"
              />
              <FormInput
                label="Serial Number"
                name="serialNumber"
                type="text"
                placeholder="e.g., SN123456"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Department"
                name="department"
                type="text"
                placeholder="e.g., Computer Science"
              />
              <FormInput
                label="Location"
                name="location"
                type="text"
                placeholder="e.g., Lab 3, Building A"
              />
            </div>
            <FormSelect
              label="Status"
              name="status"
              value="available"
              options={[
                { label: 'Available', value: 'available' },
                { label: 'Allocated', value: 'allocated' },
                { label: 'Maintenance', value: 'maintenance' },
                { label: 'Retired', value: 'retired' },
              ]}
            />
            <FormSelect
              label="Is Software"
              name="isSoftware"
              value="false"
              options={[
                { label: 'No', value: 'false' },
                { label: 'Yes', value: 'true' },
              ]}
            />
            <Button variant="primary" className="w-full" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Resource'}
            </Button>
          </form>
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedResource(null);
          }}
          title="Edit Resource"
          size="lg"
        >
          {selectedResource && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <FormInput
                label="Name"
                name="name"
                type="text"
                defaultValue={selectedResource.name}
                required
              />
              <FormSelect
                label="Resource Type"
                name="resourceTypeId"
                defaultValue={selectedResource.resource_type_id || ''}
                options={[
                  { label: 'None', value: '' },
                  ...resourceTypes.map((rt) => ({ label: rt.name, value: rt.id }))
                ]}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Asset Tag"
                  name="assetTag"
                  type="text"
                  defaultValue={selectedResource.asset_tag || ''}
                />
                <FormInput
                  label="Serial Number"
                  name="serialNumber"
                  type="text"
                  defaultValue={selectedResource.serial_number || ''}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Department"
                  name="department"
                  type="text"
                  defaultValue={selectedResource.department || ''}
                />
                <FormInput
                  label="Location"
                  name="location"
                  type="text"
                  defaultValue={selectedResource.location || ''}
                />
              </div>
              <FormSelect
                label="Status"
                name="status"
                defaultValue={selectedResource.status}
                options={[
                  { label: 'Available', value: 'available' },
                  { label: 'Allocated', value: 'allocated' },
                  { label: 'Maintenance', value: 'maintenance' },
                  { label: 'Retired', value: 'retired' },
                ]}
              />
              <FormSelect
                label="Is Software"
                name="isSoftware"
                defaultValue={(selectedResource.eav?.isSoftware || 'false').toString()}
                options={[
                  { label: 'No', value: 'false' },
                  { label: 'Yes', value: 'true' },
                ]}
              />
              <Button variant="primary" className="w-full" type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Resource'}
              </Button>
            </form>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setSelectedResource(null);
          }}
          title="Confirm Delete"
          size="md"
        >
          {selectedResource && (
            <div className="space-y-4">
              <p className="text-secondary-700">
                Are you sure you want to delete <strong>{selectedResource.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedResource(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleDeleteConfirm}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};
