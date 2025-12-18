import React, { createContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

export const CurriculumContext = createContext();

export const CurriculumProvider = ({ children }) => {
  const [courses, setCourses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const { user, authToken } = useAuth();
  
  const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
  const API_URL = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;

  // Helper for auth headers
  const getAuthHeaders = useCallback(() => {
    const token = authToken || (() => {
      try { return localStorage.getItem('authToken') || null; } catch(e){ return null; }
    })();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [authToken]);

  // Fetch courses on mount
  const fetchCourses = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/curriculum/courses`, {
        headers: getAuthHeaders() 
      });
      if (res.data.success) {
        setCourses(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  }, [API_URL, getAuthHeaders]);

  // Fetch enrolled courses for students
  const fetchEnrolledCourses = useCallback(async () => {
    if (!user || user.role !== 'student') return;
    try {
      const res = await axios.get(`${API_URL}/curriculum/courses/enrolled/${user._id}`, {
         headers: getAuthHeaders()
      });
      if (res.data.success) {
        setEnrolledCourses(res.data.data.map(c => c.id));
      }
    } catch (err) {
      console.error('Error fetching enrolled courses:', err);
    }
  }, [API_URL, user, getAuthHeaders]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (user && user.role === 'student') {
      fetchEnrolledCourses();
    }
  }, [user, fetchEnrolledCourses]);

  const getCourses = useCallback(() => courses, [courses]);

  const getCourseById = useCallback(async (id) => {
    // Try to find in state first
    const existing = courses.find((c) => c.id === id);
    if (existing) return existing;
    // Fallback to API fetch
    try {
       const res = await axios.get(`${API_URL}/curriculum/courses/${id}`, {
          headers: getAuthHeaders()
       });
       return res.data.success ? res.data.data : null;
    } catch (err) {
       console.error('Error fetching course by id:', err);
       return null;
    }
  }, [courses, API_URL, getAuthHeaders]);

  const createCourse = useCallback(async (courseData) => {
    try {
      const res = await axios.post(`${API_URL}/curriculum/courses`, courseData, {
        headers: getAuthHeaders()
      });
      if (res.data.success) {
        const newCourse = res.data.data;
        setCourses((prev) => [newCourse, ...prev]);
        return newCourse;
      }
    } catch (err) {
      console.error('Error creating course:', err);
      throw err;
    }
  }, [API_URL, getAuthHeaders]);

  const updateCourse = useCallback(async (id, courseData) => {
    try {
      const res = await axios.patch(`${API_URL}/curriculum/courses/${id}`, courseData, {
        headers: getAuthHeaders()
      });
      if (res.data.success) {
         setCourses((prev) =>
          prev.map((course) => (course.id === id ? res.data.data : course))
        );
      }
    } catch (err) {
      console.error('Error updating course:', err);
      throw err;
    }
  }, [API_URL, getAuthHeaders]);

  const deleteCourse = useCallback(async (id) => {
    try {
      await axios.delete(`${API_URL}/curriculum/courses/${id}`, {
        headers: getAuthHeaders()
      });
      setCourses((prev) => prev.filter((course) => course.id !== id));
    } catch (err) {
       console.error('Error deleting course:', err);
       throw err;
    }
  }, [API_URL, getAuthHeaders]);

  const enrollCourse = useCallback(async (courseId) => {
    if (!user) return;
    try {
       await axios.post(`${API_URL}/curriculum/courses/${courseId}/enroll`, { studentId: user._id }, {
         headers: getAuthHeaders()
       });
       setEnrolledCourses((prev) => [...new Set([...prev, courseId])]);
       // Refresh course list to update enrolled count if needed
       fetchCourses();
    } catch (err) {
       console.error('Error enrolling in course:', err);
       throw err;
    }
  }, [API_URL, user, getAuthHeaders, fetchCourses]);

  const unenrollCourse = useCallback(async (courseId) => {
    if (!user) return;
    try {
       await axios.post(`${API_URL}/curriculum/courses/${courseId}/unenroll`, { studentId: user._id }, {
         headers: getAuthHeaders()
       });
       setEnrolledCourses((prev) => prev.filter(id => id !== courseId));
       fetchCourses();
    } catch (err) {
       console.error('Error unenrolling from course:', err);
       throw err;
    }
  }, [API_URL, user, getAuthHeaders, fetchCourses]);

  // TODO: Implement Material/Assignment/Grade API calls similar to above
  // For now, keeping mock data or basic state for these to prevent breakage
  // while we focus on Course connectivity.

  const getMaterials = useCallback(() => materials, [materials]);

  const getMaterialsByCourse = useCallback((courseId) => {
    return materials.filter((material) => material.courseId === courseId);
  }, [materials]);

  const uploadMaterial = useCallback((courseId, materialData) => {
    const newMaterial = {
      id: 'material_' + Date.now(),
      courseId,
      courseName: courses.find((c) => c.id === courseId)?.name,
      uploadedAt: new Date().toISOString(),
      ...materialData,
    };
    setMaterials((prev) => [...prev, newMaterial]);
    return newMaterial;
  }, [courses]);

  const deleteMaterial = useCallback((id) => {
    setMaterials((prev) => prev.filter((material) => material.id !== id));
  }, []);

  const updateMaterial = useCallback((id, materialData) => {
    setMaterials((prev) =>
      prev.map((material) =>
        material.id === id ? { ...material, ...materialData } : material
      )
    );
  }, []);

  const getAssignments = useCallback(() => assignments, [assignments]);

  const getAssignmentsByCourse = useCallback((courseId) => {
    return assignments.filter((assignment) => assignment.courseId === courseId);
  }, [assignments]);

  const submitAssignment = useCallback((assignmentId, submissionData) => {
    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment.id === assignmentId
          ? { ...assignment, submitted: true, submittedAt: new Date().toISOString() }
          : assignment
      )
    );
  }, []);

  const getGrades = useCallback(() => grades, [grades]);

  const getGradesByStudent = useCallback(() => grades, [grades]);

  const addGrade = useCallback((assignmentId, gradeData) => {
    const newGrade = {
      id: 'grade_' + Date.now(),
      ...gradeData,
      gradedAt: new Date().toISOString(),
    };
    setGrades((prev) => [...prev, newGrade]);
  }, []);

  const value = {
    courses,
    materials,
    assignments,
    grades,
    enrolledCourses,
    getCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    enrollCourse,
    unenrollCourse, // Added unenroll
    getMaterials,
    getMaterialsByCourse,
    uploadMaterial,
    deleteMaterial,
    updateMaterial,
    getAssignments,
    getAssignmentsByCourse,
    submitAssignment,
    getGrades,
    getGradesByStudent,
    addGrade,
  };

  return (
    <CurriculumContext.Provider value={value}>{children}</CurriculumContext.Provider>
  );
};

export const useCurriculum = () => {
  const context = React.useContext(CurriculumContext);
  if (!context) {
    throw new Error('useCurriculum must be used within CurriculumProvider');
  }
  return context;
};
