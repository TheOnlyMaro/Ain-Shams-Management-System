import React, { createContext, useState, useCallback } from 'react';

export const AnnouncementContext = createContext();

export const AnnouncementProvider = ({ children }) => {
  const [announcements, setAnnouncements] = useState([]);

  const getAnnouncements = useCallback(() => announcements, [announcements]);

  const getAnnouncementById = useCallback((id) => {
    return announcements.find((ann) => ann.id === id);
  }, [announcements]);

  const getAnnouncementsByPriority = useCallback((priority) => {
    return announcements.filter((ann) => ann.priority === priority);
  }, [announcements]);

  const getRecentAnnouncements = useCallback((limit = 5) => {
    return [...announcements]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }, [announcements]);

  const createAnnouncement = useCallback((announcementData) => {
    const newAnnouncement = {
      id: 'ann_' + Date.now(),
      ...announcementData,
      createdAt: new Date().toISOString(),
      tags: announcementData.tags || [],
    };
    setAnnouncements((prev) => [newAnnouncement, ...prev]);
    return newAnnouncement;
  }, []);

  const updateAnnouncement = useCallback((id, announcementData) => {
    setAnnouncements((prev) =>
      prev.map((ann) =>
        ann.id === id ? { ...ann, ...announcementData } : ann
      )
    );
  }, []);

  const deleteAnnouncement = useCallback((id) => {
    setAnnouncements((prev) => prev.filter((ann) => ann.id !== id));
  }, []);

  const value = {
    announcements,
    getAnnouncements,
    getAnnouncementById,
    getAnnouncementsByPriority,
    getRecentAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
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
