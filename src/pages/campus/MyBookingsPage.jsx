import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, AlertCircle, Ban } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { Card, CardHeader, CardBody, Button, FormSelect } from '../../components/common';

const statusBadge = (status) => {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    case 'cancelled':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-yellow-100 text-yellow-700';
  }
};

export const MyBookingsPage = () => {
  const { classrooms, myBookings, cancelBookingRequest, fetchBookings } = useCampus();
  const [filterStatus, setFilterStatus] = useState('all');

  React.useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filtered = useMemo(() => {
    if (!filterStatus || filterStatus === 'all') return myBookings;
    return myBookings.filter((b) => b.status === filterStatus);
  }, [myBookings, filterStatus]);

  const iconForStatus = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'cancelled':
        return <Ban className="w-5 h-5 text-gray-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const roomName = (id) => classrooms.find((c) => c.id === id)?.name || id;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-secondary-900">My Classroom Bookings</h1>
            <p className="text-secondary-600 mt-2">Track the status of your booking requests</p>
          </div>
          <Link to="/classrooms" className="text-primary-600 hover:text-primary-700 font-medium">
            Back to Classrooms →
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
                  { label: 'Pending', value: 'pending' },
                  { label: 'Confirmed', value: 'confirmed' },
                  { label: 'Rejected', value: 'rejected' },
                  { label: 'Cancelled', value: 'cancelled' },
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
                        {iconForStatus(b.status)}
                        <h2 className="text-lg font-bold text-secondary-800">{roomName(b.classroomId)}</h2>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusBadge(b.status)}`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-secondary-600 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {String(b.date).slice(0, 10)} • {b.startTime}–{b.endTime}
                      </div>
                      {b.purpose && <p className="text-sm text-secondary-700 mt-2">{b.purpose}</p>}
                    </div>

                    {b.status === 'pending' && (
                      <Button variant="outline" size="sm" onClick={() => cancelBookingRequest(b.id)}>
                        Cancel
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
              <Clock className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
              <p className="text-secondary-600 text-lg">No booking requests found</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
