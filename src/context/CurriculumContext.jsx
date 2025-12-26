import React, { createContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import api from '../utils/api';
import { useAuth } from './AuthContext';

export const CurriculumContext = createContext();

const STORAGE_PREFIX = 'asms.curriculum.v1';

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

const computeLetterGrade = (points, totalPoints) => {
  const pct = totalPoints ? (points / totalPoints) * 100 : 0;
  if (pct >= 97) return 'A+';
  if (pct >= 93) return 'A';
  if (pct >= 90) return 'A-';
  if (pct >= 87) return 'B+';
  if (pct >= 83) return 'B';
  if (pct >= 80) return 'B-';
  if (pct >= 77) return 'C+';
  if (pct >= 73) return 'C';
  if (pct >= 70) return 'C-';
  if (pct >= 60) return 'D';
  return 'F';
};

export const CurriculumProvider = ({ children }) => {
  const [courses, setCourses] = useState([]);
  const [materials, setMaterials] = useState(() => readJson('materials', []));
  const [assignments, setAssignments] = useState(() => readJson('assignments', []));
  const [grades, setGrades] = useState(() => readJson('grades', []));
  const [enrolledCourses, setEnrolledCourses] = useState(() => readJson('enrolledCourses', []));

  const { user, authToken } = useAuth();

  const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
  const API_URL = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;

  useEffect(() => writeJson('materials', materials), [materials]);
  useEffect(() => writeJson('assignments', assignments), [assignments]);
  useEffect(() => writeJson('grades', grades), [grades]);
  useEffect(() => writeJson('enrolledCourses', enrolledCourses), [enrolledCourses]);

  const getAuthHeaders = useCallback(() => {
    const token =
      authToken ||
      (() => {
        try {
          return localStorage.getItem('authToken') || null;
        } catch {
          return null;
        }
      })();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [authToken]);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/curriculum/courses`, {
        headers: getAuthHeaders(),
      });
      if (res.data.success) {
        setCourses(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  }, [API_URL, getAuthHeaders]);

  const fetchEnrolledCourses = useCallback(async () => {
    if (!user || user.role !== 'student') return;
    try {
      const res = await axios.get(`${API_URL}/curriculum/courses/enrolled/${user._id}`, {
        headers: getAuthHeaders(),
      });
      if (res.data.success) {
        setEnrolledCourses(res.data.data.map((c) => c.id));
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

  const fetchGrades = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/curriculum/grades`, {
        headers: getAuthHeaders(),
      });
      if (res.data.success) {
        // Transform backend data format to frontend format
        const transformedGrades = res.data.data.map((grade) => {
          const course = courses.find((c) => String(c.id) === String(grade.courseId));
          return {
            id: grade.id,
            assignmentId: grade.assignmentId,
            courseId: grade.courseId,
            courseName: course?.name || 'Unknown Course',
            assignmentTitle: grade.assignmentTitle || 'Assignment',
            studentId: grade.studentId,
            studentName: grade.studentName || '',
            points: Number(grade.points) || 0,
            totalPoints: Number(grade.assignmentTotalPoints) || 100,
            letterGrade: computeLetterGrade(Number(grade.points) || 0, Number(grade.assignmentTotalPoints) || 100),
            feedback: grade.feedback || '',
            gradedAt: grade.updatedAt || grade.createdAt || new Date().toISOString(),
          };
        });
        setGrades(transformedGrades);
      }
    } catch (err) {
      console.error('Error fetching grades:', err);
    }
  }, [API_URL, getAuthHeaders, courses]);

  // Fetch grades after courses are loaded
  useEffect(() => {
    if (courses.length > 0 && user) {
      fetchGrades();
    }
  }, [courses.length, user, fetchGrades]);
  const fetchMaterials = useCallback(async () => {
    try {
      // Fetch materials for each course and combine them
      const allMaterials = [];
      for (const course of courses) {
        try {
          const res = await axios.get(`${API_URL}/curriculum/courses/${course.id}/materials`, {
            headers: getAuthHeaders(),
          });
          if (res.data.success && res.data.data) {
            const courseMaterials = res.data.data.map((material) => ({
              id: material.id,
              courseId: material.courseId,
              courseName: course.name || 'Unknown Course',
              title: material.title,
              type: material.type || 'document',
              fileUrl: material.fileUrl || '',
              fileSize: material.fileSize || '',
              uploadedBy: material.uploadedBy || 'Staff',
              description: material.description || '',
              uploadedAt: material.uploadedAt || new Date().toISOString(),
            }));
            allMaterials.push(...courseMaterials);
          }
        } catch (err) {
          // Skip courses that fail (might not have access)
          console.warn(`Failed to fetch materials for course ${course.id}:`, err);
        }
      }
      setMaterials(allMaterials);
    } catch (err) {
      console.error('Error fetching materials:', err);
    }
  }, [API_URL, getAuthHeaders, courses]);

  // Fetch materials after courses are loaded
  useEffect(() => {
    if (courses.length > 0 && user) {
      fetchMaterials();
    }
  }, [courses.length, user, fetchMaterials]);

  const getCourses = useCallback(() => courses, [courses]);

  const getCourseById = useCallback(
    (id) => courses.find((c) => String(c.id) === String(id)) || null,
    [courses]
  );

  const createCourse = useCallback(
    async (courseData) => {
      const res = await axios.post(`${API_URL}/curriculum/courses`, courseData, {
        headers: getAuthHeaders(),
      });
      if (res.data.success) {
        const newCourse = res.data.data;
        setCourses((prev) => [newCourse, ...prev]);
        return newCourse;
      }
      throw new Error('Failed to create course');
    },
    [API_URL, getAuthHeaders]
  );

  const updateCourse = useCallback(
    async (id, courseData) => {
      const courseId = typeof id === 'string' ? parseInt(id, 10) : id;
      const res = await axios.patch(`${API_URL}/curriculum/courses/${courseId}`, courseData, {
        headers: getAuthHeaders(),
      });
      if (res.data.success) {
        setCourses((prev) =>
          prev.map((course) => {
            const courseIdNum = typeof course.id === 'string' ? parseInt(course.id, 10) : course.id;
            return courseIdNum === courseId ? res.data.data : course;
          })
        );
        return res.data.data;
      }
      throw new Error('Failed to update course');
    },
    [API_URL, getAuthHeaders]
  );

  const deleteCourse = useCallback(
    async (id) => {
      await axios.delete(`${API_URL}/curriculum/courses/${id}`, {
        headers: getAuthHeaders(),
      });
      setCourses((prev) => prev.filter((course) => String(course.id) !== String(id)));
    },
    [API_URL, getAuthHeaders]
  );

  const enrollCourse = useCallback(
    async (courseId) => {
      if (!user) return;
      await axios.post(
        `${API_URL}/curriculum/courses/${courseId}/enroll`,
        { studentId: user._id },
        { headers: getAuthHeaders() }
      );
      setEnrolledCourses((prev) => [...new Set([...prev, courseId])]);
      fetchCourses();
    },
    [API_URL, user, getAuthHeaders, fetchCourses]
  );

  const unenrollCourse = useCallback(
    async (courseId) => {
      if (!user) return;
      await axios.post(
        `${API_URL}/curriculum/courses/${courseId}/unenroll`,
        { studentId: user._id },
        { headers: getAuthHeaders() }
      );
      setEnrolledCourses((prev) => prev.filter((id) => String(id) !== String(courseId)));
      fetchCourses();
    },
    [API_URL, user, getAuthHeaders, fetchCourses]
  );

  const getMaterials = useCallback(() => materials, [materials]);

  const getMaterialsByCourse = useCallback(
    (courseId) => materials.filter((material) => String(material.courseId) === String(courseId)),
    [materials]
  );

  const uploadMaterial = useCallback(
    async (courseId, materialData) => {
      try {
        const courseIdNum = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;

        // Generate a fileUrl - backend requires a non-empty string
        let fileUrl = materialData.fileUrl;
        if (!fileUrl || fileUrl === null) {
          // If a file is provided, create a blob URL (temporary)
          // In production, you'd upload to storage first and get the actual URL
          if (materialData.fileName) {
            // Use a placeholder path that can be replaced later
            fileUrl = `/uploads/materials/${Date.now()}_${materialData.fileName}`;
          } else {
            // Default placeholder URL
            fileUrl = `/uploads/materials/placeholder_${Date.now()}.txt`;
          }
        }

        // Ensure fileUrl is a string (not null or undefined)
        fileUrl = String(fileUrl || '').trim();
        if (!fileUrl) {
          throw new Error('File URL is required');
        }

        const payload = {
          title: String(materialData.title || '').trim(),
          type: materialData.type || 'document',
          fileUrl: fileUrl,
          fileSize: String(materialData.fileSize || '').trim(),
          description: String(materialData.description || '').trim(),
        };

        console.log('Uploading material:', {
          courseId: courseId,
          courseIdNum: courseIdNum,
          isInteger: Number.isInteger(courseIdNum),
          url: `${API_URL}/curriculum/courses/${courseIdNum}/materials`,
          payload
        });

        // Ensure courseIdNum is a valid integer
        if (!Number.isInteger(courseIdNum) || courseIdNum <= 0) {
          throw new Error(`Invalid course ID: ${courseId} (parsed as ${courseIdNum})`);
        }

        const res = await axios.post(
          `${API_URL}/curriculum/courses/${courseIdNum}/materials`,
          payload,
          {
            headers: getAuthHeaders(),
          }
        );
        if (res.data.success) {
          const course = courses.find((c) => String(c.id) === String(courseId));
          const newMaterial = {
            id: res.data.data.id,
            courseId: res.data.data.courseId,
            courseName: course?.name || 'Unknown Course',
            title: res.data.data.title,
            type: res.data.data.type,
            fileUrl: res.data.data.fileUrl,
            fileSize: res.data.data.fileSize || '',
            uploadedBy: res.data.data.uploadedBy || user?.name || 'Staff',
            description: res.data.data.description || '',
            uploadedAt: res.data.data.uploadedAt || new Date().toISOString(),
          };
          setMaterials((prev) => [newMaterial, ...prev]);
          return newMaterial;
        }
        throw new Error('Failed to upload material');
      } catch (err) {
        console.error('Error uploading material:', err);
        console.error('Error response:', err.response?.data);
        throw err;
      }
    },
    [API_URL, getAuthHeaders, courses, user]
  );

  const deleteMaterial = useCallback(
    async (id) => {
      try {
        // Find the material to get courseId
        const material = materials.find((m) => String(m.id) === String(id));
        if (!material) {
          throw new Error('Material not found');
        }

        const courseIdNum = typeof material.courseId === 'string' ? parseInt(material.courseId, 10) : material.courseId;
        const materialIdNum = typeof id === 'string' ? parseInt(id, 10) : id;

        await axios.delete(`${API_URL}/curriculum/courses/${courseIdNum}/materials/${materialIdNum}`, {
          headers: getAuthHeaders(),
        });
        setMaterials((prev) => prev.filter((material) => {
          const mId = typeof material.id === 'string' ? parseInt(material.id, 10) : material.id;
          return mId !== materialIdNum;
        }));
      } catch (err) {
        console.error('Error deleting material:', err);
        throw err;
      }
    },
    [API_URL, getAuthHeaders, materials]
  );

  const updateMaterial = useCallback(
    async (id, materialData) => {
      try {
        // Find the material to get courseId
        const material = materials.find((m) => String(m.id) === String(id));
        if (!material) {
          throw new Error('Material not found');
        }

        const courseIdNum = typeof material.courseId === 'string' ? parseInt(material.courseId, 10) : material.courseId;
        const materialIdNum = typeof id === 'string' ? parseInt(id, 10) : id;

        const updateData = {};
        if (materialData.title !== undefined) updateData.title = materialData.title;
        if (materialData.type !== undefined) updateData.type = materialData.type;
        if (materialData.description !== undefined) updateData.description = materialData.description;

        const res = await axios.patch(
          `${API_URL}/curriculum/courses/${courseIdNum}/materials/${materialIdNum}`,
          updateData,
          {
            headers: getAuthHeaders(),
          }
        );
        if (res.data.success) {
          const course = courses.find((c) => String(c.id) === String(material.courseId));
          const updatedMaterial = {
            ...res.data.data,
            courseName: course?.name || material.courseName || 'Unknown Course',
          };
          setMaterials((prev) =>
            prev.map((m) => {
              const mId = typeof m.id === 'string' ? parseInt(m.id, 10) : m.id;
              return mId === materialIdNum ? updatedMaterial : m;
            })
          );
          return updatedMaterial;
        }
        throw new Error('Failed to update material');
      } catch (err) {
        console.error('Error updating material:', err);
        throw err;
      }
    },
    [API_URL, getAuthHeaders, materials, courses]
  );

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/curriculum/assignments`, {
        headers: getAuthHeaders(),
      });
      if (res.data.success) {
        setAssignments(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
    }
  }, [API_URL, getAuthHeaders]);

  // Fetch assignments after courses are loaded
  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user, fetchAssignments]);

  const getAssignments = useCallback(() => assignments, [assignments]);

  const getAssignmentsByCourse = useCallback(
    (courseId) => assignments.filter((assignment) => String(assignment.courseId) === String(courseId)),
    [assignments]
  );

  const getAssignmentById = useCallback(
    (assignmentId) => assignments.find((a) => String(a.id) === String(assignmentId)) || null,
    [assignments]
  );

  const createAssignment = useCallback(
    async (assignmentData) => {
      try {
        const payload = {
          courseId: Number(assignmentData.courseId),
          title: assignmentData.title,
          description: assignmentData.description || '',
          dueDate: assignmentData.dueDate,
          totalPoints: Number(assignmentData.totalPoints || 100),
        };
        console.log('[CurriculumContext] creating assignment:', payload);
        const res = await api.post('/curriculum/assignments', payload);
        console.log('[CurriculumContext] create assignment response:', res.data);
        if (res.data.success) {
          const newAssignment = res.data.data;
          setAssignments((prev) => [newAssignment, ...prev]);
          return newAssignment;
        }
      } catch (err) {
        console.error('Error creating assignment:', err);
        console.error('Error details:', err.response?.data);
        throw err;
      }
    },
    []
  );

  const updateAssignment = useCallback(async (assignmentId, patch) => {
    try {
      const id = typeof assignmentId === 'string' ? parseInt(assignmentId, 10) : assignmentId;
      const res = await axios.patch(`${API_URL}/curriculum/assignments/${id}`, patch, {
        headers: getAuthHeaders(),
      });
      if (res.data.success) {
        setAssignments((prev) => prev.map((a) => (a.id === id ? res.data.data : a)));
        return res.data.data;
      }
    } catch (err) {
      console.error('Error updating assignment:', err);
      throw err;
    }
  }, [API_URL, getAuthHeaders]);

  const deleteAssignment = useCallback(async (assignmentId) => {
    try {
      const id = typeof assignmentId === 'string' ? parseInt(assignmentId, 10) : assignmentId;
      await axios.delete(`${API_URL}/curriculum/assignments/${id}`, {
        headers: getAuthHeaders(),
      });
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      setGrades((prev) => prev.filter((g) => g.assignmentId !== id));
    } catch (err) {
      console.error('Error deleting assignment:', err);
      throw err;
    }
  }, [API_URL, getAuthHeaders]);

  const submitAssignment = useCallback(async (assignmentId, submissionData) => {
    try {
      if (!user) return;
      const id = typeof assignmentId === 'string' ? parseInt(assignmentId, 10) : assignmentId;
      const studentId = user.id || user._id;

      const res = await axios.post(
        `${API_URL}/curriculum/assignments/${id}/submit`,
        { studentId: Number(studentId) },
        { headers: getAuthHeaders() }
      );

      if (res.data.success) {
        setAssignments((prev) =>
          prev.map((assignment) =>
            assignment.id === id
              ? {
                ...assignment,
                submitted: true,
                submittedAt: new Date().toISOString(),
              }
              : assignment
          )
        );
      }
    } catch (err) {
      console.error('Error submitting assignment:', err);
      throw err;
    }
  }, [API_URL, getAuthHeaders, user]);

  const getGrades = useCallback(() => grades, [grades]);

  const getGradesByStudent = useCallback(
    (studentId) => {
      if (!studentId) return grades;
      return grades.filter((g) => String(g.studentId || '') === String(studentId));
    },
    [grades]
  );

  const addGrade = useCallback(
    async (assignmentId, gradeData) => {
      try {
        const assignmentIdNum = typeof assignmentId === 'string' ? parseInt(assignmentId, 10) : assignmentId;
        const courseIdNum = typeof gradeData.courseId === 'string' ? parseInt(gradeData.courseId, 10) : gradeData.courseId;
        const studentIdNum = gradeData.studentId
          ? (typeof gradeData.studentId === 'string' ? parseInt(gradeData.studentId, 10) : gradeData.studentId)
          : null;

        if (!studentIdNum || !Number.isInteger(studentIdNum)) {
          throw new Error('Valid student ID is required');
        }

        const res = await axios.post(
          `${API_URL}/curriculum/grades`,
          {
            courseId: courseIdNum,
            assignmentId: assignmentIdNum,
            studentId: studentIdNum,
            points: Number(gradeData.points) || 0,
            feedback: gradeData.feedback || '',
          },
          {
            headers: getAuthHeaders(),
          }
        );
        if (res.data.success) {
          const course = courses.find((c) => String(c.id) === String(gradeData.courseId));
          const assignment = assignments.find((a) => String(a.id) === String(assignmentId));
          const newGrade = {
            id: res.data.data.id,
            assignmentId: res.data.data.assignmentId,
            courseId: res.data.data.courseId,
            courseName: course?.name || gradeData.courseName || 'Unknown Course',
            assignmentTitle: res.data.data.assignmentTitle || assignment?.title || 'Assignment',
            studentId: res.data.data.studentId,
            studentName: res.data.data.studentName || gradeData.studentName || '',
            points: Number(res.data.data.points) || 0,
            totalPoints: Number(res.data.data.assignmentTotalPoints) || Number(gradeData.totalPoints) || 100,
            letterGrade: computeLetterGrade(
              Number(res.data.data.points) || 0,
              Number(res.data.data.assignmentTotalPoints) || Number(gradeData.totalPoints) || 100
            ),
            feedback: res.data.data.feedback || '',
            gradedAt: res.data.data.updatedAt || res.data.data.createdAt || new Date().toISOString(),
          };
          setGrades((prev) => [newGrade, ...prev]);
          return newGrade;
        }
        throw new Error('Failed to create grade');
      } catch (err) {
        console.error('Error creating grade:', err);
        throw err;
      }
    },
    [API_URL, getAuthHeaders, courses, assignments]
  );

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
    unenrollCourse,

    getMaterials,
    getMaterialsByCourse,
    uploadMaterial,
    deleteMaterial,
    updateMaterial,

    getAssignments,
    getAssignmentsByCourse,
    getAssignmentById,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    submitAssignment,

    getGrades,
    getGradesByStudent,
    addGrade,
  };

  return <CurriculumContext.Provider value={value}>{children}</CurriculumContext.Provider>;
};

export const useCurriculum = () => {
  const context = React.useContext(CurriculumContext);
  if (!context) {
    throw new Error('useCurriculum must be used within CurriculumProvider');
  }
  return context;
};
