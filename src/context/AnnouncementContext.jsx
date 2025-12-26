import React, { createContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

export const AnnouncementContext = createContext();

export const AnnouncementProvider = ({ children }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [messages, setMessages] = useState([]);
  const { user, authToken } = useAuth();

  const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
  const API_URL = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;

  const getAuthHeaders = useCallback(() => {
    const token = authToken || localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [authToken]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/announcements/announcements`, {
        headers: getAuthHeaders(),
      });
      if (res.data.success) {
        setAnnouncements(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
    }
  }, [API_URL, getAuthHeaders]);

  const fetchMessages = useCallback(async (type = 'inbox') => {
    try {
      const res = await axios.get(`${API_URL}/announcements/messages?type=${type}`, {
        headers: getAuthHeaders(),
      });
      if (res.data.success) {
        setMessages(res.data.data);
        return res.data.data;
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      return [];
    }
  }, [API_URL, getAuthHeaders]);

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
      const res = await axios.post(`${API_URL}/announcements/announcements`, announcementData, {
        headers: getAuthHeaders(),
      });
      if (res.data.success) {
        const newAnn = res.data.data;
        setAnnouncements((prev) => [newAnn, ...prev]);
        return newAnn;
      }
    } catch (err) {
      console.error('Error creating announcement:', err);
      throw err;
    }
  }, [API_URL, getAuthHeaders]);

  const updateAnnouncement = useCallback(async (id, announcementData) => {
    try {
      const res = await axios.patch(`${API_URL}/announcements/announcements/${id}`, announcementData, {
        headers: getAuthHeaders(),
      });
      if (res.data.success) {
        const updated = res.data.data;
        setAnnouncements((prev) => prev.map((ann) => (String(ann.id) === String(id) ? updated : ann)));
        return updated;
      }
    } catch (err) {
      console.error('Error updating announcement:', err);
      throw err;
    }
  }, [API_URL, getAuthHeaders]);

  const deleteAnnouncement = useCallback(async (id) => {
    try {
      await axios.delete(`${API_URL}/announcements/announcements/${id}`, {
        headers: getAuthHeaders(),
      });
      setAnnouncements((prev) => prev.filter((ann) => String(ann.id) !== String(id)));
    } catch (err) {
      console.error('Error deleting announcement:', err);
      throw err;
    }
  }, [API_URL, getAuthHeaders]);

  const sendMessage = useCallback(async (messageData) => {
    try {
      const res = await axios.post(`${API_URL}/announcements/messages`, messageData, {
        headers: getAuthHeaders(),
      });
      return res.data;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, [API_URL, getAuthHeaders]);

  const value = {
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
  };

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
