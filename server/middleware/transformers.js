// Helpers to map between SQL rows and legacy API JSON expected by the frontend

const toLegacyId = (id) => (id != null ? String(id) : undefined);

exports.mapUserRowToApi = (row) => {
  if (!row) return null;
  return {
    _id: toLegacyId(row.id),
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    role: row.role_name || row.role || '',
    staffType: row.staff_type || null,
    specialInfo: row.special_info || '',
    createdAt: row.created_at,
  };
};

exports.mapCourseRowToApi = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: toLegacyId(row.id),
    code: row.code,
    name: row.name,
    description: row.description || '',
    instructor: row.instructor_name || '',
    instructorEmail: row.instructor_email || '',
    schedule: row.schedule || '',
    location: row.location || 'TBD',
    credits: Number(row.credits) || 0,
    capacity: Number(row.capacity) || 0,
    enrolled: Number(row.enrolled) || 0,
    status: row.status || 'published',
    tags: Array.isArray(row.tags) ? row.tags : [],
    students: Array.isArray(row.student_ids) ? row.student_ids.map(String) : [],
    materials: Array.isArray(row.materials) ? row.materials : [],
    metadata: {
      department: row.department || '',
      level: row.level || '',
      semester: row.semester || '',
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

exports.mapApplicationRowToApi = (row) => {
  if (!row) return null;
  return {
    _id: toLegacyId(row.id),
    id: row.national_id || toLegacyId(row.id),
    studentName: row.student_name || '',
    email: row.email || '',
    phoneNumber: row.phone_number || '',
    appliedProgram: row.applied_program || '',
    gpa: row.gpa != null ? Number(row.gpa) : 0,
    testScore: row.test_score != null ? Number(row.test_score) : 0,
    age: row.age != null ? Number(row.age) : 0,
    nationalId: row.national_id,
    idPhoto: row.id_photo || '',
    selfiePhoto: row.selfie_photo || '',
    certificates: Array.isArray(row.certificates) ? row.certificates : [],
    documents: Array.isArray(row.documents) ? row.documents : [],
    submittedAt: row.submitted_at,
    applicationStatus: row.application_status || 'pending',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// For inserts/updates from API → SQL shape
exports.mapCourseApiToSql = (body) => ({
  code: body.code,
  name: body.name,
  description: body.description || '',
  instructor_name: body.instructor || body.instructorName || '',
  instructor_email: body.instructorEmail || '',
  schedule: body.schedule || '',
  location: body.location || 'TBD',
  credits: Number(body.credits) || 0,
  capacity: Number(body.capacity) || 0,
  enrolled: Number(body.enrolled || 0),
  status: body.status || 'published',
  department: body.metadata?.department || '',
  level: body.metadata?.level || '',
  semester: body.metadata?.semester || '',
});

exports.mapGradeRowToApi = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: toLegacyId(row.id),
    courseId: row.course_id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    studentName: row.student_name || '',
    studentEmail: row.student_email || '',
    points: Number(row.points) || 0,
    feedback: row.feedback || '',
    assignmentTitle: row.assignment_title || '',
    assignmentTotalPoints: Number(row.assignment_total_points) || 0,
  };
};

exports.mapClassroomRowToApi = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    roomNumber: row.room_number || '',
    building: row.building || '',
    floor: Number(row.floor) || 0,
    roomType: row.room_type || 'classroom',
    capacity: Number(row.capacity) || 0,
    amenities: row.amenities || '',
    equipment: row.equipment || '',
    isActive: row.is_active !== false,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

exports.mapGradeApiToSql = (body) => ({
  course_id: Number(body.courseId || body.course_id || body.course) || null,
  assignment_id: Number(body.assignmentId || body.assignment_id || body.assignment) || null,
  student_id: Number(body.studentId || body.student_id || body.student) || null,
  points: Number(body.points) || 0,
  feedback: body.feedback || '',
});

exports.mapClassroomApiToSql = (body) => ({
  room_number: body.roomNumber || body.room_number || '',
  building: body.building || '',
  floor: Number(body.floor) || 0,
  room_type: body.roomType || body.room_type || 'classroom',
  capacity: Number(body.capacity) || 0,
  amenities: body.amenities || '',
  equipment: body.equipment || '',
  is_active: body.isActive !== false,
  notes: body.notes || '',
});