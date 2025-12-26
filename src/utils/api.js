import axios from 'axios';
import { getToken } from './tokenStore';

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:4000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (email, password, role) =>
    apiClient.post('/auth/login', { email, password, role }),
  signup: (userData) =>
    apiClient.post('/auth/signup', userData),
  logout: () =>
    apiClient.post('/auth/logout'),
  getCurrentUser: () =>
    apiClient.get('/auth/me'),
};

export const curriculumApi = {
  getCourses: () =>
    apiClient.get('/curriculum/courses'),
  getCourseById: (id) =>
    apiClient.get(`/curriculum/courses/${id}`),
  createCourse: (data) =>
    apiClient.post('/curriculum/courses', data),
  updateCourse: (id, data) =>
    apiClient.put(`/curriculum/courses/${id}`, data),
  deleteCourse: (id) =>
    apiClient.delete(`/curriculum/courses/${id}`),
  enrollCourse: (courseId) =>
    apiClient.post(`/curriculum/courses/${courseId}/enroll`),
  getMaterials: () =>
    apiClient.get('/curriculum/materials'),
  uploadMaterial: (courseId, data) =>
    apiClient.post(`/curriculum/courses/${courseId}/materials`, data),
  deleteMaterial: (materialId) =>
    apiClient.delete(`/curriculum/materials/${materialId}`),
  updateMaterial: (materialId, data) =>
    apiClient.put(`/curriculum/materials/${materialId}`, data),
  getAssignments: () =>
    apiClient.get('/curriculum/assignments'),
  submitAssignment: (assignmentId, data) =>
    apiClient.post(`/curriculum/assignments/${assignmentId}/submit`, data),
  getGrades: () =>
    apiClient.get('/curriculum/grades'),
  gradeAssignment: (assignmentId, data) =>
    apiClient.post(`/curriculum/assignments/${assignmentId}/grade`, data),
};

export const admissionApi = {
  getApplications: () =>
    apiClient.get('/admission/applications'),
  getApplicationById: (id) =>
    apiClient.get(`/admission/applications/${id}`),
  createApplication: (data) =>
    apiClient.post('/admission/applications', data),
  updateApplicationStatus: (id, status) =>
    apiClient.put(`/admission/applications/${id}/status`, { status }),
  uploadDocument: (applicationId, data) =>
    apiClient.post(`/admission/applications/${applicationId}/documents`, data),
  deleteDocument: (applicationId, documentId) =>
    apiClient.delete(`/admission/applications/${applicationId}/documents/${documentId}`),
};

export const announcementApi = {
  getAnnouncements: () =>
    apiClient.get('/announcements'),
  getAnnouncementById: (id) =>
    apiClient.get(`/announcements/${id}`),
  createAnnouncement: (data) =>
    apiClient.post('/announcements', data),
  updateAnnouncement: (id, data) =>
    apiClient.put(`/announcements/${id}`, data),
  deleteAnnouncement: (id) =>
    apiClient.delete(`/announcements/${id}`),
};

export const payrollApi = {
  // List payruns
  getPayruns: () => apiClient.get('/payrolls'),
  getPayrun: (id) => apiClient.get(`/payrolls/${id}`),
  createPayrun: (data) => apiClient.post('/payrolls', data),
  addEntry: (payrunId, data) => apiClient.post(`/payrolls/${payrunId}/entries`, data),
  addComponent: (entryId, data) => apiClient.post(`/payrolls/entries/${entryId}/components`, data),
  finalize: (payrunId) => apiClient.patch(`/payrolls/${payrunId}/finalize`),
};

export const performanceApi = {
  listReviews: (params) => apiClient.get('/performance', { params }),
  getReview: (id) => apiClient.get(`/performance/${id}`),
  createReview: (data) => apiClient.post('/performance', data),
  addGoal: (reviewId, data) => apiClient.post(`/performance/${reviewId}/goals`, data),
  addFeedback: (reviewId, data) => apiClient.post(`/performance/${reviewId}/feedback`, data),
  updateReview: (id, data) => apiClient.patch(`/performance/${id}`, data),
};

export default apiClient;
