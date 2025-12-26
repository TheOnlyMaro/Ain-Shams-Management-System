-- ============================================================================
-- UNIVERSITY MANAGEMENT SYSTEM - PostgreSQL Schema (Supabase)
-- MongoDB Atlas Migration
-- ============================================================================

-- TABLE: roles (lookup table)
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES ('student'), ('admin'), ('staff'), ('parent');

-- TABLE: users (single role per user)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL DEFAULT '',
  national_id VARCHAR(50), -- Added for Parent-Student verification
  role_id INTEGER NOT NULL REFERENCES roles(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_national_id ON users(national_id);
CREATE INDEX idx_users_role_id ON users(role_id);

-- TABLE: courses
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  instructor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  instructor_name VARCHAR(255) NOT NULL,
  instructor_email VARCHAR(255) NOT NULL DEFAULT '',
  schedule VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL DEFAULT 'TBD',
  credits INTEGER NOT NULL CHECK (credits >= 1 AND credits <= 6),
  capacity INTEGER NOT NULL CHECK (capacity >= 1),
  enrolled INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  department VARCHAR(100) NOT NULL DEFAULT '',
  level VARCHAR(50) NOT NULL DEFAULT '',
  semester VARCHAR(50) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courses_code ON courses(code);
CREATE INDEX idx_courses_instructor_id ON courses(instructor_id);

-- TABLE: assignments
CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  due_date TIMESTAMP NOT NULL,
  total_points INTEGER NOT NULL CHECK (total_points > 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assignments_course_id ON assignments(course_id);

-- TABLE: grades
CREATE TABLE grades (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (points >= 0),
  feedback TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(assignment_id, student_id)
);

CREATE INDEX idx_grades_student_id ON grades(student_id);
CREATE INDEX idx_grades_assignment_id ON grades(assignment_id);

-- TABLE: applications
CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  student_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL DEFAULT '',
  applied_program VARCHAR(255) NOT NULL,
  gpa DECIMAL(3,2) NOT NULL CHECK (gpa >= 0 AND gpa <= 4),
  test_score INTEGER NOT NULL DEFAULT 0 CHECK (test_score >= 0 AND test_score <= 100),
  age INTEGER NOT NULL DEFAULT 0 CHECK (age > 0),
  national_id VARCHAR(16) NOT NULL UNIQUE,
  id_photo VARCHAR(500) NOT NULL DEFAULT '',
  selfie_photo VARCHAR(500) NOT NULL DEFAULT '',
  application_status VARCHAR(50) NOT NULL DEFAULT 'pending' 
    CHECK (application_status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_applications_national_id ON applications(national_id);
CREATE INDEX idx_applications_email ON applications(email);

-- ============================================================================
-- JUNCTION & TRACKING TABLES
-- ============================================================================

-- TABLE: refresh_tokens
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NOT NULL DEFAULT '2099-12-31'
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- TABLE: course_enrollments
CREATE TABLE course_enrollments (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NOT NULL DEFAULT '2099-12-31',
  UNIQUE(course_id, student_id)
);

CREATE INDEX idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX idx_course_enrollments_student_id ON course_enrollments(student_id);

-- TABLE: parent_students
CREATE TABLE parent_students (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_id, student_id)
);

CREATE INDEX idx_parent_students_parent_id ON parent_students(parent_id);
CREATE INDEX idx_parent_students_student_id ON parent_students(student_id);

-- TABLE: tags
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- TABLE: course_tags
CREATE TABLE course_tags (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
  UNIQUE(course_id, tag_id)
);

CREATE INDEX idx_course_tags_course_id ON course_tags(course_id);

-- TABLE: course_materials
CREATE TABLE course_materials (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('pdf', 'video', 'document', 'presentation', 'link')),
  file_url VARCHAR(500) NOT NULL,
  file_size VARCHAR(50) NOT NULL DEFAULT '',
  uploaded_by VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_course_materials_course_id ON course_materials(course_id);

-- TABLE: application_documents
CREATE TABLE application_documents (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('certificate', 'document')),
  url VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NOT NULL DEFAULT '',
  filename VARCHAR(255) NOT NULL DEFAULT '',
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_application_documents_application_id ON application_documents(application_id);

-- TABLE: application_activity_logs
CREATE TABLE application_activity_logs (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  staff_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_application_activity_logs_application_id ON application_activity_logs(application_id);

-- TABLE: application_notifications
CREATE TABLE application_notifications (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_application_notifications_application_id ON application_notifications(application_id);

-- ============================================================================
-- EAV SUBSYSTEM (Typed, Minimal)
-- ============================================================================
-- Used for: staffType (admissions/other), user preferences, LMS metadata
-- NOT used for core entities (users, courses, assignments, grades, applications)

CREATE TABLE eav_attributes (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  attribute_name VARCHAR(100) NOT NULL,
  data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('string', 'integer', 'decimal', 'boolean', 'datetime', 'json')),
  is_searchable BOOLEAN NOT NULL DEFAULT FALSE,
  is_indexed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type, attribute_name)
);

INSERT INTO eav_attributes (entity_type, attribute_name, data_type, is_searchable) VALUES
  ('user', 'staffType', 'string', FALSE),
  ('user', 'preferredLanguage', 'string', TRUE),
  ('course', 'lms_external_id', 'string', FALSE),
  ('course', 'lms_sync_metadata', 'json', FALSE),
  ('application', 'custom_field_1', 'string', FALSE),
  ('lms_integration', 'canvas_api_key', 'string', FALSE),
  ('lms_integration', 'blackboard_config', 'json', FALSE);

CREATE TABLE eav_values (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  attribute_id INTEGER NOT NULL REFERENCES eav_attributes(id) ON DELETE CASCADE,
  string_value VARCHAR(1000) NOT NULL DEFAULT '',
  integer_value INTEGER NOT NULL DEFAULT 0,
  decimal_value DECIMAL(19,4) NOT NULL DEFAULT 0,
  boolean_value BOOLEAN NOT NULL DEFAULT FALSE,
  datetime_value TIMESTAMP NOT NULL DEFAULT '2099-12-31',
  json_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type, entity_id, attribute_id)
);

CREATE INDEX idx_eav_values_entity ON eav_values(entity_type, entity_id);
CREATE INDEX idx_eav_values_attribute_id ON eav_values(attribute_id);

-- ============================================================================
-- COURSE METADATA VIA EAV (FINAL)
-- ============================================================================
-- All course metadata is stored in the typed EAV subsystem above.
-- Add new keys by inserting rows into eav_attributes with entity_type='course'.
-- Example seed keys already included: 'lms_external_id' (string), 'lms_sync_metadata' (json).

-- Helpful index for fast course metadata lookups
CREATE INDEX IF NOT EXISTS idx_eav_values_course
  ON eav_values(entity_type, attribute_id, entity_id)
  WHERE entity_type = 'course';

-- Convenience view to expose course metadata in a key/value shape
CREATE OR REPLACE VIEW vw_course_metadata AS
SELECT
  v.id,
  v.entity_id AS course_id,
  a.attribute_name AS meta_key,
  CASE a.data_type
    WHEN 'string'   THEN NULLIF(v.string_value, '')
    WHEN 'integer'  THEN (v.integer_value)::text
    WHEN 'decimal'  THEN (v.decimal_value)::text
    WHEN 'boolean'  THEN CASE WHEN v.boolean_value THEN 'true' ELSE 'false' END
    WHEN 'datetime' THEN to_char(v.datetime_value, 'YYYY-MM-DD"T"HH24:MI:SS')
    WHEN 'json'     THEN v.json_value::text
  END AS meta_value,
  v.created_at
FROM eav_values v
JOIN eav_attributes a ON a.id = v.attribute_id
WHERE v.entity_type = 'course';

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- 16 tables total
-- All fields NOT NULL with sensible defaults
-- Single role per user (role_id in users table)
-- staffType moved to EAV (entity_type='user', attribute_name='staffType')
-- Multi-to-many relationships via junction tables
-- Embedded documents → separate relational tables
-- Core entities (users, courses, assignments, grades, applications) = relational only
-- Typed EAV for dynamic/optional metadata only; course metadata exposed via vw_course_metadata

-- ============================================================================
-- QUIZ SUBSYSTEM (Added later)
-- ============================================================================

-- TABLE: quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP,
  time_limit_minutes INTEGER DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);

-- TABLE: quiz_questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('mcq', 'short_answer')),
  options JSONB DEFAULT '[]'::jsonb, -- Array of strings for MCQ options
  correct_answer TEXT, -- For MCQ, the correct option string. For short answer, the expected text (optional validation)
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);

-- TABLE: quiz_submissions
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP,
  score DECIMAL(5,2) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(quiz_id, student_id) -- One submission per student per quiz for now
);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_id ON quiz_submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student_id ON quiz_submissions(student_id);

-- TABLE: quiz_answers
CREATE TABLE IF NOT EXISTS quiz_answers (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES quiz_submissions(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  is_correct BOOLEAN DEFAULT NULL,
  points_awarded DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(submission_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_submission_id ON quiz_answers(submission_id);
