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

  const [classrooms, setClassrooms] = useState([]);
  const [bookings, setBookings] = useState(() => readJson('bookings', []));
  const [events, setEvents] = useState(() => readJson('events', DEFAULT_EVENTS));
  const [maintenanceIssues, setMaintenanceIssues] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState(() => readJson('payrollRecords', []));
  const [researchPublications, setResearchPublications] = useState(() =>
    readJson('researchPublications', DEFAULT_RESEARCH)
  );

  useEffect(() => writeJson('classrooms', classrooms), [classrooms]);
  useEffect(() => writeJson('bookings', bookings), [bookings]);

  // Fetch classrooms from API
  const fetchClassrooms = useCallback(async () => {
    try {
      const res = await api.get('/classrooms');
      if (res.data.success) {
        // Map API response to frontend expected structure if necessary
        // Backend returns: snake_case mostly, but check transformers.js
        // Step 154 transformers.js: mapClassroomRowToApi returns camelCase: roomNumber, building, capacity, etc.
        // Frontend expects: id, name, building, capacity, features
        // Let's verify mapping:
        // API: id, roomNumber, building, floor, roomType, capacity, amenities
        // Frontend (DEFAULT_CLASSROOMS): id, name, building, capacity, features
        const mapped = res.data.data.map(c => ({
          ...c,
          name: `${c.roomNumber} (${c.building})`, // Construct a display name
          features: c.amenities ? c.amenities.split(',') : [] // Map amenities string to features array
        }));
        setClassrooms(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch classrooms', err);
    }
  }, []);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  useEffect(() => writeJson('payrollRecords', payrollRecords), [payrollRecords]);
  useEffect(() => writeJson('researchPublications', researchPublications), [researchPublications]);

  const getApprovedBookingsForClassroomDate = useCallback(
    (classroomId, dateISO) => {
      const dateKey = new Date(dateISO).toISOString().slice(0, 10);
      return bookings
        .filter(
          (b) =>
            b.classroomId === classroomId &&
            b.status === 'confirmed' &&
            String(b.date).slice(0, 10) === dateKey
        )
        .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
    },
    [bookings]
  );

  const fetchBookings = useCallback(async (params = {}) => {
    if (!user) return [];
    try {
      const { classroomId, startDate, endDate, status } = params;
      const queryParams = new URLSearchParams();
      if (classroomId) queryParams.append('classroomId', classroomId);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (status) queryParams.append('status', status);

      const res = await api.get(`/bookings?${queryParams.toString()}`);
      if (res.data.success) {
        // Map backend format (start_time, end_time as ISO) to frontend format (date, startTime HH:MM, endTime HH:MM)
        const mapped = res.data.data.map((b) => {
          const start = new Date(b.startTime); // API returns startTime as ISO
          const end = new Date(b.endTime);
          return {
            ...b,
            date: start.toISOString(), // Keep full ISO as date source
            startTime: start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            endTime: end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            requestedBy: {
              id: b.bookedByUserId,
              name: b.bookedByName,
              role: 'user', // Backend doesn't return role yet, defaulting
            },
          };
        });
        setBookings(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch bookings', err);
      return [];
    }
  }, [user]);

  // Initial fetch for all booking data (or optimise to fetch on specific page views)
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get('/announcements/events');
      if (res.data.success) {
        // Map backend format (start_date, end_date) to frontend format (date, time)
        const mapped = res.data.data.map(e => ({
          ...e,
          date: e.startDate || e.date,
          time: e.startDate ? new Date(e.startDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : e.time
        }));
        setEvents(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch events', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user, fetchEvents]);

  const hasConflict = useCallback(
    ({ classroomId, date, startTime, endTime, ignoreBookingId = null }) => {
      // This is a client-side check for immediate feedback, but the server handles race conditions.
      // We rely on the current 'bookings' state which should be reasonably fresh.
      const dateKey = new Date(date).toISOString().slice(0, 10);
      const confirmed = bookings.filter(
        (b) =>
          b.status === 'confirmed' && // In DB schema it defaults to 'confirmed' for course bookings, or we might use 'approved' in frontend ref. Backend uses 'confirmed' enum.
          b.classroomId === classroomId &&
          String(b.startTime).slice(0, 10) === dateKey && // DB stores ISO string
          (ignoreBookingId ? b.id !== ignoreBookingId : true)
      );

      return confirmed.some((b) => {
        // Backend uses ISO strings for startTime/endTime.
        const bStart = new Date(b.startTime).toISOString().slice(11, 16); // HH:MM
        const bEnd = new Date(b.endTime).toISOString().slice(11, 16);
        return rangesOverlap(startTime, endTime, bStart, bEnd);
      });
    },
    [bookings]
  );

  const createBookingRequest = useCallback(
    async ({ classroomId, date, startTime, endTime, purpose }) => {
      if (!user) throw new Error('You must be logged in to request a booking');
      if (!classroomId || !date || !startTime || !endTime) throw new Error('Please fill out all required fields');

      // Combine date + time
      const startDateTime = `${date.split('T')[0]}T${startTime}:00`;
      const endDateTime = `${date.split('T')[0]}T${endTime}:00`;

      const res = await api.post('/bookings', {
        classroomId,
        title: purpose || 'Booking',
        description: purpose || '',
        startTime: new Date(startDateTime).toISOString(),
        endTime: new Date(endDateTime).toISOString(),
        bookingType: 'event', // or differentiate if needed
      });

      // Optimistic update or refetch
      await fetchBookings();
      return res.data.data;
    },
    [user, fetchBookings]
  );

  const cancelBookingRequest = useCallback(
    async (bookingId) => {
      await api.patch(`/bookings/${bookingId}/cancel`);
      await fetchBookings();
    },
    [fetchBookings]
  );



  // Placeholder for now, knowing it might fail if I don't add backend support.
  const reviewBookingRequest = useCallback(
    async ({ bookingId, action }) => {
      // action: 'approve' | 'reject'
      const status = action === 'approve' ? 'confirmed' : 'cancelled';
      await api.patch(`/bookings/${bookingId}/status`, { status });
      await fetchBookings();
    },
    [fetchBookings]
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

    // Debug logging
    console.log('Filtering myBookings for uid:', uid, typeof uid);
    if (bookings.length > 0) {
      console.log('Sample booking requestedBy:', bookings[0].requestedBy);
    }

    return bookings.filter((b) => {
      // Handle type mismatch (string vs number)
      return String(b.requestedBy?.id) === String(uid);
    });
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
    fetchBookings,
    fetchClassrooms, // Expose this too just in case
  };

  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
};

export const useCampus = () => {
  const ctx = React.useContext(CampusContext);
  if (!ctx) throw new Error('useCampus must be used within CampusProvider');
  return ctx;
};
