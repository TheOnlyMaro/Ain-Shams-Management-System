import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Users, Clock, Plus, CheckCircle, AlertTriangle } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { Card, CardHeader, CardBody, Button, Modal, FormInput, FormTextarea } from '../../components/common';

const todayKey = () => new Date().toISOString().slice(0, 10);

export const ClassroomsPage = () => {
  const { classrooms, getApprovedBookingsForClassroomDate, createBookingRequest } = useCampus();

  const [date, setDate] = useState(todayKey());
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [showRequest, setShowRequest] = useState(false);
  const [form, setForm] = useState({ startTime: '09:00', endTime: '10:00', purpose: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const scheduleForSelected = useMemo(() => {
    if (!selectedClassroom) return [];
    return getApprovedBookingsForClassroomDate(selectedClassroom.id, date);
  }, [selectedClassroom, getApprovedBookingsForClassroomDate, date]);

  const openRequest = (classroom) => {
    setSelectedClassroom(classroom);
    setShowRequest(true);
    setError(null);
    setSuccess(null);
  };

  const handleRequest = (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      createBookingRequest({
        classroomId: selectedClassroom.id,
        date,
        startTime: form.startTime,
        endTime: form.endTime,
        purpose: form.purpose,
      });
      setSuccess('Booking request submitted. Awaiting approval.');
      setForm({ startTime: '09:00', endTime: '10:00', purpose: '' });
      setShowRequest(false);
    } catch (err) {
      setError(err?.message || 'Failed to submit request');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-secondary-900">Classrooms</h1>
            <p className="text-secondary-600 mt-2">Check availability and request a room booking</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/classrooms/bookings" className="text-primary-600 hover:text-primary-700 font-medium">
              My Booking Requests →
            </Link>
          </div>
        </div>

        {(error || success) && (
          <div
            className={`mb-6 p-3 rounded-lg border ${
              error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {error ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
              <span className="font-medium">{error || success}</span>
            </div>
          </div>
        )}

        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="min-w-[240px]">
                <FormInput
                  label="Date"
                  name="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="text-sm text-secondary-600 flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Showing approved bookings for {date}
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {classrooms.map((room) => {
            const bookings = getApprovedBookingsForClassroomDate(room.id, date);
            return (
              <Card key={room.id}>
                <CardHeader className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-secondary-800">{room.name}</h2>
                    <div className="mt-2 space-y-1 text-sm text-secondary-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {room.building}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Capacity: {room.capacity}
                      </div>
                    </div>
                  </div>
                  <Button variant="primary" size="sm" className="flex items-center gap-2" onClick={() => openRequest(room)}>
                    <Plus className="w-4 h-4" />
                    Request
                  </Button>
                </CardHeader>
                <CardBody>
                  {bookings.length > 0 ? (
                    <div className="space-y-2">
                      {bookings.map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-2 text-sm text-secondary-700">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">
                              {b.startTime}–{b.endTime}
                            </span>
                            <span className="text-secondary-500">•</span>
                            <span className="text-secondary-600">{b.purpose || 'Booked'}</span>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                            Approved
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-secondary-600">No approved bookings for this date.</div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>

        <Modal
          isOpen={showRequest}
          onClose={() => setShowRequest(false)}
          title={selectedClassroom ? `Request Booking: ${selectedClassroom.name}` : 'Request Booking'}
          size="lg"
        >
          <form onSubmit={handleRequest} className="space-y-4">
            {selectedClassroom && scheduleForSelected.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">Approved bookings on {date}</p>
                <div className="space-y-1">
                  {scheduleForSelected.map((b) => (
                    <p key={b.id} className="text-sm text-blue-800">
                      {b.startTime}–{b.endTime} • {b.purpose || 'Booked'}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Start time"
                name="startTime"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                required
              />
              <FormInput
                label="End time"
                name="endTime"
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                required
              />
            </div>

            <FormTextarea
              label="Purpose (optional)"
              name="purpose"
              rows={3}
              placeholder="e.g., Study group, club meeting"
              value={form.purpose}
              onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
            />

            <Button variant="primary" className="w-full">
              Submit Request
            </Button>
          </form>
        </Modal>
      </div>
    </div>
  );
};
