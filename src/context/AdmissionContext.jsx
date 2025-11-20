import React, { createContext, useState, useCallback } from 'react';

export const AdmissionContext = createContext();

const mockApplications = [
  {
    id: 'app_1',
    studentId: 'student_1',
    studentName: 'Alice Johnson',
    email: 'alice@university.edu',
    phoneNumber: '+1234567890',
    appliedProgram: 'Bachelor of Science in Computer Science',
    applicationStatus: 'pending',
    submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    gpa: 3.8,
    testScore: 1450,
    documents: [
      { id: 'doc_1', name: 'Transcript.pdf', type: 'transcript', uploadedAt: new Date().toISOString() },
      { id: 'doc_2', name: 'Essays.pdf', type: 'essay', uploadedAt: new Date().toISOString() },
    ],
  },
  {
    id: 'app_2',
    studentId: 'student_2',
    studentName: 'Bob Smith',
    email: 'bob@university.edu',
    phoneNumber: '+1234567891',
    appliedProgram: 'Bachelor of Science in Business Administration',
    applicationStatus: 'approved',
    submittedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    gpa: 3.6,
    testScore: 1380,
    documents: [
      { id: 'doc_3', name: 'Transcript.pdf', type: 'transcript', uploadedAt: new Date().toISOString() },
    ],
    approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'app_3',
    studentId: 'student_3',
    studentName: 'Carol Davis',
    email: 'carol@university.edu',
    phoneNumber: '+1234567892',
    appliedProgram: 'Master of Engineering',
    applicationStatus: 'rejected',
    submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    gpa: 3.2,
    testScore: 1200,
    documents: [],
    rejectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    rejectionReason: 'GPA below minimum requirement',
  },
];

export const AdmissionProvider = ({ children }) => {
  const [applications, setApplications] = useState(mockApplications);

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
