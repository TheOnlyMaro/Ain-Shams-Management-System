import React, { useMemo, useState } from 'react';
import { CheckCircle, XCircle, Clock, Building2, AlertTriangle } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { Card, CardHeader, CardBody, Button, FormSelect } from '../../components/common';

export const AdminBookingRequestsPage = () => {
  const { classrooms, bookings, reviewBookingRequest, fetchBookings } = useCampus();
  const [filterStatus, setFilterStatus] = useState('pending');
  const [error, setError] = useState(null);

  React.useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const roomName = (id) => classrooms.find((c) => c.id === id)?.name || id;

  const filtered = useMemo(() => {
    const list = filterStatus === 'all' ? bookings : bookings.filter((b) => b.status === filterStatus);
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [bookings, filterStatus]);

  const handleReview = (bookingId, action) => {
    setError(null);
    try {
      reviewBookingRequest({ bookingId, action });
    } catch (err) {
      setError(err?.message || 'Failed to update request');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-secondary-900">Classroom Booking Approvals</h1>
          <p className="text-secondary-600 mt-2">Approve or reject classroom booking requests</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <Card className="mb-6">
          <CardBody>
            <div className="max-w-[260px]">
              <FormSelect
                label="Status"
                name="status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value || 'pending')}
                options={[
                  { label: 'Pending', value: 'pending' },
                  { label: 'Confirmed', value: 'confirmed' },
                  { label: 'Rejected', value: 'rejected' },
                  { label: 'Cancelled', value: 'cancelled' },
                  { label: 'All', value: 'all' },
                ]}
              />
            </div>
          </CardBody>
        </Card>

        {filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((b) => (
              <Card key={b.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary-600" />
                        <h2 className="text-lg font-bold text-secondary-800">{roomName(b.classroomId)}</h2>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-semibold ${b.status === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : b.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : b.status === 'cancelled'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                        >
                          {b.status}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-secondary-600 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {String(b.date).slice(0, 10)} • {b.startTime}–{b.endTime}
                      </div>
                      <p className="text-sm text-secondary-700 mt-2">{b.purpose || '—'}</p>
                      <p className="text-xs text-secondary-500 mt-2">
                        Requested by {b.requestedBy?.name || 'User'} ({b.requestedBy?.role || 'role'})
                      </p>
                    </div>

                    {b.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => handleReview(b.id, 'reject')}
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => handleReview(b.id, 'approve')}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-secondary-500">
                        {b.reviewedAt ? `Reviewed: ${String(b.reviewedAt).slice(0, 10)}` : ''}
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
              <p className="text-secondary-600 text-lg">No requests found</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
