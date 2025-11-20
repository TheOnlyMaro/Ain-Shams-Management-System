import React, { createContext, useState, useCallback } from 'react';

export const AnnouncementContext = createContext();

const mockAnnouncements = [
  {
    id: 'ann_1',
    title: 'Welcome to the Spring 2024 Semester',
    content: 'We are excited to welcome all students to the Spring 2024 semester. Classes begin on January 15th.',
    author: 'Admin',
    authorRole: 'administrator',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    tags: ['semester', 'welcome'],
  },
  {
    id: 'ann_2',
    title: 'Library Extended Hours During Finals',
    content: 'The library will remain open 24 hours during the finals week to support your studying needs.',
    author: 'Library Staff',
    authorRole: 'staff',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'medium',
    tags: ['library', 'finals'],
  },
  {
    id: 'ann_3',
    title: 'Campus Maintenance Scheduled',
    content: 'Please note that building maintenance will occur on weekends. Some facilities may be temporarily unavailable.',
    author: 'Facilities',
    authorRole: 'staff',
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'low',
    tags: ['maintenance', 'facilities'],
  },
  {
    id: 'ann_4',
    title: 'Spring Break Dates',
    content: 'Spring break will be from March 10th to March 17th. No classes will be held during this period.',
    author: 'Registrar',
    authorRole: 'administrator',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    tags: ['calendar', 'important'],
  },
];

export const AnnouncementProvider = ({ children }) => {
  const [announcements, setAnnouncements] = useState(mockAnnouncements);

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
