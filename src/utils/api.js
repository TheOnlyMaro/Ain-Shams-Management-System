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

export const quizApi = {
  createQuiz: (data) =>
    apiClient.post('/quizzes', data),
  getQuizzesByCourse: (courseId) =>
    apiClient.get(`/quizzes/course/${courseId}`),
  getQuizDetails: (quizId) =>
    apiClient.get(`/quizzes/${quizId}`),
  startQuiz: (quizId) =>
    apiClient.post(`/quizzes/${quizId}/start`),
  submitQuiz: (quizId, answers) =>
    apiClient.post(`/quizzes/${quizId}/submit`, { answers }),
  getStudentResult: (quizId) =>
    apiClient.get(`/quizzes/${quizId}/result`),
};

export const parentApi = {
  connectChild: (data) =>
    apiClient.post('/parents/connect', data),
  getChildren: () =>
    apiClient.get('/parents/children'),
  getChildProgress: (studentId) =>
    apiClient.get(`/parents/children/${studentId}/progress`),
};

export const resourcesApi = {
  getResources: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    return apiClient.get(`/resources?${query.toString()}`);
  },
  getResource: (resourceId) =>
    apiClient.get(`/resources/${resourceId}`),
  createResource: (data) =>
    apiClient.post('/resources', data),
  updateResource: (resourceId, data) =>
    apiClient.patch(`/resources/${resourceId}`, data),
  deleteResource: (resourceId) =>
    apiClient.delete(`/resources/${resourceId}`),
  getResourceTypes: () =>
    apiClient.get('/resources/types'),
  createResourceType: (data) =>
    apiClient.post('/resources/types', data),
  updateResourceType: (typeId, data) =>
    apiClient.patch(`/resources/types/${typeId}`, data),
};

export const allocationsApi = {
  getAllocations: (params = {}) => {
    const query = new URLSearchParams();
    if (params.resourceId) query.append('resourceId', params.resourceId);
    if (params.userId) query.append('userId', params.userId);
    return apiClient.get(`/allocations?${query.toString()}`);
  },
  getAllocation: (allocationId) =>
    apiClient.get(`/allocations/${allocationId}`),
  createAllocation: (data) =>
    apiClient.post('/allocations', data),
  updateAllocation: (allocationId, data) =>
    apiClient.patch(`/allocations/${allocationId}`, data),
  deleteAllocation: (allocationId) =>
    apiClient.delete(`/allocations/${allocationId}`),
};

export default apiClient;
