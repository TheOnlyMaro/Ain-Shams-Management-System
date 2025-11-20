import React, { createContext, useState, useCallback } from 'react';

export const CurriculumContext = createContext();

const mockCourses = [
  {
    id: 'course_1',
    name: 'Introduction to Computer Science',
    code: 'CS101',
    instructor: 'Dr. John Smith',
    credits: 3,
    description: 'Fundamentals of computer science and programming',
    schedule: 'MWF 9:00 AM - 10:30 AM',
    capacity: 30,
    enrolled: 28,
  },
  {
    id: 'course_2',
    name: 'Data Structures and Algorithms',
    code: 'CS201',
    instructor: 'Prof. Jane Doe',
    credits: 4,
    description: 'Advanced data structures and algorithm design',
    schedule: 'TuTh 10:00 AM - 11:30 AM',
    capacity: 25,
    enrolled: 24,
  },
  {
    id: 'course_3',
    name: 'Database Systems',
    code: 'CS301',
    instructor: 'Dr. Mike Johnson',
    credits: 3,
    description: 'Database design and SQL programming',
    schedule: 'MWF 2:00 PM - 3:30 PM',
    capacity: 20,
    enrolled: 18,
  },
  {
    id: 'course_4',
    name: 'Web Development',
    code: 'CS250',
    instructor: 'Sarah Williams',
    credits: 3,
    description: 'Full-stack web development with modern frameworks',
    schedule: 'TuTh 1:00 PM - 2:30 PM',
    capacity: 35,
    enrolled: 32,
  },
  {
    id: 'course_5',
    name: 'Machine Learning Basics',
    code: 'CS401',
    instructor: 'Dr. Alex Chen',
    credits: 4,
    description: 'Introduction to machine learning algorithms',
    schedule: 'MWF 11:00 AM - 12:30 PM',
    capacity: 22,
    enrolled: 20,
  },
];

const mockMaterials = [
  {
    id: 'material_1',
    courseId: 'course_1',
    courseName: 'Introduction to Computer Science',
    title: 'Lecture 1: Computer Basics',
    type: 'pdf',
    uploadedBy: 'Dr. John Smith',
    uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    fileSize: '2.5 MB',
    url: '#',
  },
  {
    id: 'material_2',
    courseId: 'course_1',
    courseName: 'Introduction to Computer Science',
    title: 'Python Tutorial Video',
    type: 'video',
    uploadedBy: 'Dr. John Smith',
    uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    fileSize: '150 MB',
    url: '#',
  },
  {
    id: 'material_3',
    courseId: 'course_2',
    courseName: 'Data Structures and Algorithms',
    title: 'Assignment 1: Linked Lists',
    type: 'pdf',
    uploadedBy: 'Prof. Jane Doe',
    uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    fileSize: '1.2 MB',
    url: '#',
  },
];

const mockAssignments = [
  {
    id: 'assign_1',
    courseId: 'course_1',
    courseName: 'Introduction to Computer Science',
    title: 'Assignment 1: Variables and Data Types',
    description: 'Write a program to demonstrate understanding of variables and data types',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    totalPoints: 100,
    submitted: false,
  },
  {
    id: 'assign_2',
    courseId: 'course_1',
    courseName: 'Introduction to Computer Science',
    title: 'Assignment 2: Control Structures',
    description: 'Write programs using loops and conditionals',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    totalPoints: 100,
    submitted: false,
  },
  {
    id: 'assign_3',
    courseId: 'course_2',
    courseName: 'Data Structures and Algorithms',
    title: 'Project 1: Implement Stack and Queue',
    description: 'Implement Stack and Queue data structures with all operations',
    dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    totalPoints: 150,
    submitted: false,
  },
];

const mockGrades = [
  {
    id: 'grade_1',
    courseId: 'course_1',
    courseName: 'Introduction to Computer Science',
    assignmentTitle: 'Assignment 1: Variables and Data Types',
    points: 95,
    totalPoints: 100,
    letterGrade: 'A',
    gradedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    feedback: 'Excellent work! Well structured code.',
  },
  {
    id: 'grade_2',
    courseId: 'course_2',
    courseName: 'Data Structures and Algorithms',
    assignmentTitle: 'Assignment 1: Linked Lists',
    points: 88,
    totalPoints: 100,
    letterGrade: 'B+',
    gradedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    feedback: 'Good implementation. Consider optimizing for edge cases.',
  },
];

export const CurriculumProvider = ({ children }) => {
  const [courses, setCourses] = useState(mockCourses);
  const [materials, setMaterials] = useState(mockMaterials);
  const [assignments, setAssignments] = useState(mockAssignments);
  const [grades, setGrades] = useState(mockGrades);
  const [enrolledCourses, setEnrolledCourses] = useState(['course_1', 'course_2']);

  const getCourses = useCallback(() => courses, [courses]);

  const getCourseById = useCallback((id) => {
    return courses.find((course) => course.id === id);
  }, [courses]);

  const createCourse = useCallback((courseData) => {
    const newCourse = {
      id: 'course_' + Date.now(),
      ...courseData,
      enrolled: 0,
    };
    setCourses((prev) => [...prev, newCourse]);
    return newCourse;
  }, []);

  const updateCourse = useCallback((id, courseData) => {
    setCourses((prev) =>
      prev.map((course) => (course.id === id ? { ...course, ...courseData } : course))
    );
  }, []);

  const deleteCourse = useCallback((id) => {
    setCourses((prev) => prev.filter((course) => course.id !== id));
  }, []);

  const enrollCourse = useCallback((courseId) => {
    setEnrolledCourses((prev) => [...new Set([...prev, courseId])]);
  }, []);

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
