import React, { useState } from 'react';
import { Package, Search, CalendarDays, MapPin, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useResources } from '../../context/ResourcesContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardBody, Button, FormInput, FormSelect, Modal } from '../../components/common';

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

const statusIcon = (status) => {
  switch (status) {
    case 'available':
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'allocated':
      return <AlertCircle className="w-5 h-5 text-blue-600" />;
    case 'maintenance':
      return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    case 'retired':
      return <XCircle className="w-5 h-5 text-gray-600" />;
    default:
      return null;
  }
};

export const ResourcesPage = () => {
  const { user } = useAuth();
  const { availableResources, myAllocations, createAllocation, fetchResources, fetchAllocations } = useResources();
  const [search, setSearch] = useState('');
  const [selectedResource, setSelectedResource] = useState(null);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  // Filter available resources
  const filteredResources = availableResources.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.asset_tag.toLowerCase().includes(search.toLowerCase()) ||
    r.serial_number.toLowerCase().includes(search.toLowerCase())
  );

  const handleReserveClick = (resource) => {
    setSelectedResource(resource);
    setShowReserveModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleReserveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResource || !user) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await createAllocation({
        resourceId: selectedResource.id,
        allocatedToUserId: user.id || user._id,
        allocatedToDepartment: user.department || '',
        allocatedBy: user.id || user._id,
        notes: `Reserved by ${user.name} (${user.role})`,
      });
      setSuccess('Resource reserved successfully!');
      await fetchAllocations({ userId: user.id || user._id });
      await fetchResources();
      setTimeout(() => {
        setShowReserveModal(false);
        setSelectedResource(null);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reserve resource');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-secondary-900">Resources</h1>
          <p className="text-secondary-600 mt-2">Browse and reserve available resources</p>
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

        {/* Search Bar */}
        <Card className="mb-6">
          <CardBody>
            <div className="max-w-md">
              <FormInput
                label="Search resources"
                name="search"
                type="text"
                placeholder="Search by name, asset tag, or serial number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardBody>
        </Card>

        {/* Available Resources */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-secondary-800 mb-4">Available Resources</h2>
          {filteredResources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map((resource) => (
                <Card key={resource.id}>
                  <CardHeader className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {statusIcon(resource.status)}
                        <h3 className="text-lg font-bold text-secondary-800">{resource.name}</h3>
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-secondary-600">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <span className="font-medium">Asset Tag:</span> {resource.asset_tag || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Serial:</span> {resource.serial_number || 'N/A'}
                        </div>
                        {resource.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {resource.location}
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
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => handleReserveClick(resource)}
                    >
                      Reserve Now
                    </Button>
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                <p className="text-secondary-600 text-lg">
                  {search ? 'No resources match your search' : 'No resources available at the moment'}
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* My Reservations */}
        <div>
          <h2 className="text-2xl font-bold text-secondary-800 mb-4">My Reservations</h2>
          {myAllocations.length > 0 ? (
            <div className="space-y-4">
              {myAllocations.map((allocation) => (
                <Card key={allocation.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-primary-600" />
                          <h3 className="text-lg font-bold text-secondary-800">{allocation.resource_name}</h3>
                        </div>
                        <div className="mt-2 text-sm text-secondary-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            <span className="font-medium">Asset Tag:</span> {allocation.asset_tag || 'N/A'}
                          </div>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4" />
                            <span className="font-medium">Allocated:</span>{' '}
                            {new Date(allocation.allocated_at).toLocaleDateString()} at{' '}
                            {new Date(allocation.allocated_at).toLocaleTimeString()}
                          </div>
                          {allocation.due_back && (
                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-4 h-4" />
                              <span className="font-medium">Due Back:</span>{' '}
                              {new Date(allocation.due_back).toLocaleDateString()} at{' '}
                              {new Date(allocation.due_back).toLocaleTimeString()}
                            </div>
                          )}
                          {allocation.allocated_to_name && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span className="font-medium">Allocated to:</span> {allocation.allocated_to_name}
                            </div>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          allocation.status === 'allocated'
                            ? 'bg-blue-100 text-blue-700'
                            : allocation.status === 'returned'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {allocation.status}
                      </span>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                <p className="text-secondary-600 text-lg">You haven't reserved any resources yet</p>
              </div>
            </Card>
          )}
        </div>

        {/* Reserve Modal */}
        <Modal
          isOpen={showReserveModal}
          onClose={() => {
            setShowReserveModal(false);
            setSelectedResource(null);
          }}
          title="Confirm Reservation"
          size="md"
        >
          {selectedResource && (
            <form onSubmit={handleReserveSubmit} className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-secondary-800">{selectedResource.name}</h3>
                <p className="text-sm text-secondary-600 mt-1">
                  Asset Tag: {selectedResource.asset_tag || 'N/A'}
                </p>
                {selectedResource.serial_number && (
                  <p className="text-sm text-secondary-600">
                    Serial Number: {selectedResource.serial_number}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-secondary-600">
                <User className="w-4 h-4" />
                <span>Reserving as: {user?.name}</span>
              </div>

              <Button
                variant="primary"
                className="w-full"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Reserving...' : 'Confirm Reservation'}
              </Button>
            </form>
          )}
        </Modal>
      </div>
    </div>
  );
};
