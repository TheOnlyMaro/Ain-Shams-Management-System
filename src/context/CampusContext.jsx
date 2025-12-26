import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';

export const CampusContext = createContext();

const STORAGE_PREFIX = 'asms.campus.v1';

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}:${key}`, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const parseTimeToMinutes = (time) => {
  if (!time) return 0;
  const [h, m] = String(time).split(':').map((v) => parseInt(v, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};

const rangesOverlap = (startA, endA, startB, endB) => {
  const aStart = parseTimeToMinutes(startA);
  const aEnd = parseTimeToMinutes(endA);
  const bStart = parseTimeToMinutes(startB);
  const bEnd = parseTimeToMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
};

const DEFAULT_CLASSROOMS = [
  {
    id: 'CR-101',
    name: 'Room 101',
    building: 'Science Block',
    capacity: 40,
    features: ['Projector', 'Whiteboard'],
  },
  {
    id: 'CR-204',
    name: 'Room 204',
    building: 'Main Building',
    capacity: 60,
    features: ['Projector', 'PA System'],
  },
  {
    id: 'LAB-3',
    name: 'Computer Lab 3',
    building: 'Engineering Block',
    capacity: 30,
    features: ['Computers', 'Air Conditioning'],
  },
];

const DEFAULT_EVENTS = [
  {
    id: 'EVT-ORIENTATION',
    title: 'New Student Orientation',
    description: 'Welcome session for new students with campus tour and Q&A.',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    time: '10:00',
    location: 'Auditorium',
    category: 'Campus',
  },
  {
    id: 'EVT-HACKATHON',
    title: 'University Hackathon',
    description: 'Team up, build something awesome, and win prizes.',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
    time: '09:00',
    location: 'Innovation Hub',
    category: 'Academic',
  },
];

const DEFAULT_RESEARCH = [
  {
    id: 'RCH-001',
    title: 'A Survey of Modern Web Performance Optimizations',
    abstract: 'An overview of front-end performance techniques and real-world trade-offs.',
    authors: ['ASMS Research Group'],
    keywords: ['web', 'performance', 'frontend'],
    status: 'published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
];

export const CampusProvider = ({ children }) => {
  const { user } = useAuth();

  const [classrooms, setClassrooms] = useState(() => readJson('classrooms', DEFAULT_CLASSROOMS));
  const [bookings, setBookings] = useState(() => readJson('bookings', []));
  const [events, setEvents] = useState(() => readJson('events', DEFAULT_EVENTS));
  const [maintenanceIssues, setMaintenanceIssues] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState(() => readJson('payrollRecords', []));
  const [researchPublications, setResearchPublications] = useState(() =>
    readJson('researchPublications', DEFAULT_RESEARCH)
  );

  useEffect(() => writeJson('classrooms', classrooms), [classrooms]);
  useEffect(() => writeJson('bookings', bookings), [bookings]);
  useEffect(() => writeJson('events', events), [events]);

  useEffect(() => writeJson('payrollRecords', payrollRecords), [payrollRecords]);
  useEffect(() => writeJson('researchPublications', researchPublications), [researchPublications]);

  const getApprovedBookingsForClassroomDate = useCallback(
    (classroomId, dateISO) => {
      const dateKey = new Date(dateISO).toISOString().slice(0, 10);
      return bookings
        .filter(
          (b) =>
            b.classroomId === classroomId &&
            b.status === 'approved' &&
            String(b.date).slice(0, 10) === dateKey
        )
        .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
    },
    [bookings]
  );

  const hasConflict = useCallback(
    ({ classroomId, date, startTime, endTime, ignoreBookingId = null }) => {
      const dateKey = new Date(date).toISOString().slice(0, 10);
      const approved = bookings.filter(
        (b) =>
          b.status === 'approved' &&
          b.classroomId === classroomId &&
          String(b.date).slice(0, 10) === dateKey &&
          (ignoreBookingId ? b.id !== ignoreBookingId : true)
      );
      return approved.some((b) => rangesOverlap(startTime, endTime, b.startTime, b.endTime));
    },
    [bookings]
  );

  const createBookingRequest = useCallback(
    ({ classroomId, date, startTime, endTime, purpose }) => {
      if (!user) {
        throw new Error('You must be logged in to request a booking');
      }
      if (!classroomId || !date || !startTime || !endTime) {
        throw new Error('Please fill out all required fields');
      }
      if (parseTimeToMinutes(startTime) >= parseTimeToMinutes(endTime)) {
        throw new Error('End time must be after start time');
      }
      if (hasConflict({ classroomId, date, startTime, endTime })) {
        throw new Error('This time slot is already booked');
      }

      const newBooking = {
        id: `BK-${Date.now()}`,
        classroomId,
        date: new Date(date).toISOString(),
        startTime,
        endTime,
        purpose: purpose || '',
        status: 'pending',
        requestedBy: {
          id: user._id || user.id || 'unknown',
          name: user.name || 'User',
          role: user.role || 'user',
        },
        createdAt: new Date().toISOString(),
        reviewedAt: null,
        reviewedBy: null,
      };
      setBookings((prev) => [newBooking, ...prev]);
      return newBooking;
    },
    [user, hasConflict]
  );

  const cancelBookingRequest = useCallback(
    (bookingId) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled', updatedAt: new Date().toISOString() } : b))
      );
    },
    [setBookings]
  );

  const reviewBookingRequest = useCallback(
    ({ bookingId, action }) => {
      if (!user) throw new Error('You must be logged in');

      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return;

      if (action === 'approve') {
        const conflict = bookings
          .filter(
            (b) =>
              b.id !== bookingId &&
              b.status === 'approved' &&
              b.classroomId === booking.classroomId &&
              String(b.date).slice(0, 10) === String(booking.date).slice(0, 10)
          )
          .some((b) => rangesOverlap(booking.startTime, booking.endTime, b.startTime, b.endTime));

        if (conflict) {
          throw new Error('Cannot approve: this request conflicts with an existing booking');
        }
      }

      const nextStatus = action === 'approve' ? 'approved' : 'rejected';
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
              ...b,
              status: nextStatus,
              reviewedAt: new Date().toISOString(),
              reviewedBy: {
                id: user._id || user.id || 'unknown',
                name: user.name || 'Reviewer',
                role: user.role || 'user',
              },
            }
            : b
        )
      );
    },
    [user, bookings]
  );

  const fetchMaintenanceIssues = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/maintenance');
      setMaintenanceIssues(res.data.data);
    } catch (err) {
      console.error('Failed to fetch maintenance issues', err);
    }
  }, [user]);

  useEffect(() => {
    fetchMaintenanceIssues();
  }, [fetchMaintenanceIssues]);

  const reportMaintenanceIssue = useCallback(
    async ({ location, category, description, priority }) => {
      if (!user) throw new Error('You must be logged in');
      if (!location || !description) throw new Error('Location and description are required');

      // Map frontend 'category' to backend 'issueType' if needed
      // Frontend options: General, Electrical, Plumbing, HVAC, IT / Network
      // Backend enum: general, equipment, furniture, electrical, plumbing, heating, cleaning, safety, other
      let issueType = 'general';
      if (category) {
        const lower = category.toLowerCase();
        if (['electrical', 'plumbing'].includes(lower)) issueType = lower;
        else if (lower === 'hvac') issueType = 'heating';
        else if (lower.includes('it')) issueType = 'other'; // or equipment
      }

      await api.post('/maintenance', {
        location,
        issueType,
        title: `${category} Issue at ${location}`,
        description,
        priority: priority || 'medium'
      });

      // Refresh list
      await fetchMaintenanceIssues();
    },
    [user, fetchMaintenanceIssues]
  );

  const updateMaintenanceIssue = useCallback(async (issueId, patch) => {
    try {
      // If updating status or notes, send to API
      const payload = {};
      if (patch.status) payload.status = patch.status;
      if (patch.resolutionNotes) payload.resolutionNotes = patch.resolutionNotes;
      if (patch.assignedToUserId) payload.assignedToUserId = patch.assignedToUserId;

      if (Object.keys(payload).length > 0) {
        const res = await api.patch(`/maintenance/${issueId}`, payload);
        // Use server response to update local state
        setMaintenanceIssues((prev) =>
          prev.map((i) => (i.id === issueId ? { ...i, ...res.data.data } : i))
        );
      } else {
        // Fallback for local-only updates (if any remain)
        setMaintenanceIssues((prev) =>
          prev.map((i) => (i.id === issueId ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i))
        );
      }
    } catch (err) {
      console.error('Failed to update maintenance issue', err);
      throw err; // Re-throw so UI can handle error
    }
  }, []);

  const seedPayrollForStaffIfNeeded = useCallback(
    (staffId) => {
      if (!staffId) return;
      setPayrollRecords((prev) => {
        if (prev.some((r) => r.staffId === staffId)) return prev;
        const now = new Date();
        const months = [0, 1, 2].map((offset) => {
          const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
          const periodStart = new Date(d.getFullYear(), d.getMonth(), 1);
          const periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
          const gross = 4200 + offset * 50;
          const deductions = 650;
          return {
            id: `PAY-${staffId}-${periodStart.toISOString().slice(0, 7)}`,
            staffId,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            gross,
            deductions,
            net: gross - deductions,
            status: 'paid',
            paidAt: new Date(periodEnd.getTime() + 1000 * 60 * 60 * 24 * 2).toISOString(),
          };
        });
        return [...months, ...prev];
      });
    },
    [setPayrollRecords]
  );

  const publishResearch = useCallback(
    ({ title, abstract, authors, keywords }) => {
      if (!user) throw new Error('You must be logged in');
      if (!title || !abstract) throw new Error('Title and abstract are required');
      const newPub = {
        id: `RCH-${Date.now()}`,
        title,
        abstract,
        authors: (authors || []).filter(Boolean),
        keywords: (keywords || []).filter(Boolean),
        status: 'published',
        publishedAt: new Date().toISOString(),
        submittedBy: {
          id: user._id || user.id || 'unknown',
          name: user.name || 'User',
          role: user.role || 'user',
        },
      };
      setResearchPublications((prev) => [newPub, ...prev]);
      return newPub;
    },
    [user]
  );

  const myBookings = useMemo(() => {
    const uid = user?._id || user?.id;
    if (!uid) return [];
    return bookings.filter((b) => b.requestedBy?.id === uid);
  }, [bookings, user]);

  const myMaintenanceIssues = useMemo(() => {
    const uid = user?._id || user?.id;
    if (!uid) return [];
    return maintenanceIssues.filter((i) => i.reportedBy?.id === uid);
  }, [maintenanceIssues, user]);

  const getPayrollForStaff = useCallback(
    (staffId) => payrollRecords.filter((p) => p.staffId === staffId),
    [payrollRecords]
  );

  const value = {
    classrooms,
    bookings,
    events,
    maintenanceIssues,
    payrollRecords,
    researchPublications,

    getApprovedBookingsForClassroomDate,
    createBookingRequest,
    cancelBookingRequest,
    reviewBookingRequest,
    hasConflict,

    reportMaintenanceIssue,
    updateMaintenanceIssue,

    seedPayrollForStaffIfNeeded,
    getPayrollForStaff,

    publishResearch,

    myBookings,
    myMaintenanceIssues,
  };

  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
};

export const useCampus = () => {
  const ctx = React.useContext(CampusContext);
  if (!ctx) throw new Error('useCampus must be used within CampusProvider');
  return ctx;
};
