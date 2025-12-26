import React, { createContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import api from '../utils/api';
import { useAuth } from './AuthContext';

export const AnnouncementContext = createContext();

export const AnnouncementProvider = ({ children }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [messages, setMessages] = useState([]);
  const { user } = useAuth();

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await api.get('/announcements/announcements');
      if (res.data.success) {
        setAnnouncements(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
    }
  }, []);

  const fetchMessages = useCallback(async (type = 'inbox') => {
    try {
      const res = await api.get(`/announcements/messages?type=${type}`);
      if (res.data.success) {
        setMessages(res.data.data);
        return res.data.data;
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
    }
  }, [user, fetchAnnouncements]);

  const getAnnouncements = useCallback(() => announcements, [announcements]);

  const getAnnouncementById = useCallback((id) => {
    return announcements.find((ann) => String(ann.id) === String(id));
  }, [announcements]);

  const getAnnouncementsByPriority = useCallback((priority) => {
    return announcements.filter((ann) => ann.priority === priority);
  }, [announcements]);

  const getRecentAnnouncements = useCallback((limit = 5) => {
    return [...announcements]
      .sort((a, b) => new Date(b.publish_date || b.createdAt) - new Date(a.publish_date || a.createdAt))
      .slice(0, limit);
  }, [announcements]);

  const createAnnouncement = useCallback(async (announcementData) => {
    try {
      const res = await api.post('/announcements/announcements', announcementData);
      if (res.data.success) {
        const newAnn = res.data.data;
        setAnnouncements((prev) => [newAnn, ...prev]);
        return newAnn;
      }
    } catch (err) {
      console.error('Error creating announcement:', err);
      throw err;
    }
  }, []);

  const updateAnnouncement = useCallback(async (id, announcementData) => {
    try {
      const res = await api.patch(`/announcements/announcements/${id}`, announcementData);
      if (res.data.success) {
        const updated = res.data.data;
        setAnnouncements((prev) => prev.map((ann) => (String(ann.id) === String(id) ? updated : ann)));
        return updated;
      }
    } catch (err) {
      console.error('Error updating announcement:', err);
      throw err;
    }
  }, []);

  const deleteAnnouncement = useCallback(async (id) => {
    try {
      await api.delete(`/announcements/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((ann) => String(ann.id) !== String(id)));
    } catch (err) {
      console.error('Error deleting announcement:', err);
      throw err;
    }
  }, []);

  const sendMessage = useCallback(async (messageData) => {
    try {
      const res = await api.post('/announcements/messages', messageData);
      return res.data;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, []);

  const value = useMemo(() => ({
    announcements,
    messages,
    fetchAnnouncements,
    fetchMessages,
    getAnnouncements,
    getAnnouncementById,
    getAnnouncementsByPriority,
    getRecentAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    sendMessage,
  }), [
    announcements,
    messages,
    fetchAnnouncements,
    fetchMessages,
    getAnnouncements,
    getAnnouncementById,
    getAnnouncementsByPriority,
    getRecentAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    sendMessage,
  ]);

  return (
    <AnnouncementContext.Provider value={value}>
      {children}
    </AnnouncementContext.Provider>
  );
};

export const useAnnouncement = () => {
  const context = React.useContext(AnnouncementContext);
  if (!context) {
    throw new Error('useAnnouncement must be used within AnnouncementProvider');
  }
  return context;
};
