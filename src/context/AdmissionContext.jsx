import React, { createContext, useState, useCallback } from 'react';

export const AdmissionContext = createContext();

export const AdmissionProvider = ({ children }) => {
  const [applications, setApplications] = useState([]);

  const getApplications = useCallback(() => applications, [applications]);

  const getApplicationById = useCallback((id) => {
    return applications.find((app) => app.id === id);
  }, [applications]);

  const createApplication = useCallback((applicationData) => {
    const newApplication = {
      id: 'app_' + Date.now(),
      ...applicationData,
      applicationStatus: 'pending',
      submittedAt: new Date().toISOString(),
      documents: [],
    };
    setApplications((prev) => [...prev, newApplication]);
    return newApplication;
  }, []);

  const updateApplicationStatus = useCallback((id, status, additionalData = {}) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          const updated = { ...app, applicationStatus: status, ...additionalData };
          if (status === 'approved') {
            updated.approvedAt = new Date().toISOString();
          } else if (status === 'rejected') {
            updated.rejectedAt = new Date().toISOString();
          }
          return updated;
        }
        return app;
      })
    );
  }, []);

  const uploadDocument = useCallback((applicationId, document) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === applicationId) {
          const newDocument = {
            id: 'doc_' + Date.now(),
            ...document,
            uploadedAt: new Date().toISOString(),
          };
          return {
            ...app,
            documents: [...(app.documents || []), newDocument],
          };
        }
        return app;
      })
    );
  }, []);

  const deleteDocument = useCallback((applicationId, documentId) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === applicationId) {
          return {
            ...app,
            documents: app.documents.filter((doc) => doc.id !== documentId),
          };
        }
        return app;
      })
    );
  }, []);

  const value = {
    applications,
    getApplications,
    getApplicationById,
    createApplication,
    updateApplicationStatus,
    uploadDocument,
    deleteDocument,
  };

  return (
    <AdmissionContext.Provider value={value}>{children}</AdmissionContext.Provider>
  );
};

export const useAdmission = () => {
  const context = React.useContext(AdmissionContext);
  if (!context) {
    throw new Error('useAdmission must be used within AdmissionProvider');
  }
  return context;
};
