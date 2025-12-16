-- ============================================================================
-- QUICK REFERENCE: Table List & Common Queries
-- ============================================================================

-- 16 TABLES TOTAL
-- 
-- roles, users (with role_id FK)
-- courses, assignments, grades, course_enrollments, course_materials, course_tags, tags
-- applications, application_documents, application_activity_logs, application_notifications
-- refresh_tokens
-- eav_attributes, eav_values

-- ============================================================================
-- SCHEMA SUMMARY
-- ============================================================================

CORE ENTITIES (No EAV):
  users (id, name, email, password, phone, role_id, created_at, updated_at)
  courses (id, code, name, description, instructor_id, schedule, capacity, enrolled, status, ...)
  assignments (id, course_id, title, description, due_date, total_points, ...)
  grades (id, course_id, assignment_id, student_id, points, feedback, ...)
  applications (id, student_name, email, national_id, gpa, test_score, status, ...)

LOOKUP TABLES:
  roles (id, name)

JUNCTION TABLES:
  course_enrollments (id, course_id, student_id, enrolled_at, completed_at)
  course_tags (id, course_id, tag_id)
  tags (id, name)

RELATED TABLES:
  course_materials (id, course_id, title, type, file_url, uploaded_by, ...)
  refresh_tokens (id, user_id, token, created_at, expires_at, revoked_at)
  application_documents (id, application_id, document_type, url, ...)
  application_activity_logs (id, application_id, staff_id, action, note, ...)
  application_notifications (id, application_id, type, message, sent_at, delivered)

EAV SYSTEM:
  eav_attributes (id, entity_type, attribute_name, data_type, is_searchable, ...)
  eav_values (id, entity_type, entity_id, attribute_id, string_value, integer_value, ...)
  vw_course_metadata (view: course_id, meta_key, meta_value) -- convenience for course metadata

-- ============================================================================
-- KEY CHANGES FROM ORIGINAL REQUEST
-- ============================================================================

1. Single Role (not multi-role):
   - users.role_id directly references roles table
   - Removed user_roles junction table

2. staffType moved to EAV:
   - eav_attributes has ('user', 'staffType', 'string')
   - Only staff users have this attribute (no nulls)

3. All fields NOT NULL:
   - phone VARCHAR NOT NULL DEFAULT ''
   - test_score INTEGER NOT NULL DEFAULT 0
   - description TEXT NOT NULL DEFAULT ''
   - completed_at TIMESTAMP NOT NULL DEFAULT '2099-12-31'

-- ============================================================================
-- BASIC QUERIES
-- ============================================================================

-- Get user's role
SELECT r.name FROM roles r
JOIN users u ON u.role_id = r.id
WHERE u.id = 5;

-- Get courses a student is enrolled in
SELECT c.code, c.name FROM courses c
JOIN course_enrollments ce ON c.id = ce.course_id
WHERE ce.student_id = 10;

-- Get all grades for a student
SELECT a.title, g.points, g.feedback
FROM grades g
JOIN assignments a ON g.assignment_id = a.id
WHERE g.student_id = 10
ORDER BY a.due_date;

-- Get courses with available seats
SELECT code, name, (capacity - enrolled) as available
FROM courses
WHERE status = 'published' AND enrolled < capacity;

-- Get user's staffType (EAV)
SELECT ev.string_value
FROM eav_values ev
JOIN eav_attributes ea ON ev.attribute_id = ea.id
WHERE ea.attribute_name = 'staffType' 
  AND ev.entity_type = 'user' 
  AND ev.entity_id = 5;

-- Get application audit trail
SELECT aal.action, u.name as staff_name, aal.created_at
FROM application_activity_logs aal
LEFT JOIN users u ON aal.staff_id = u.id
WHERE aal.application_id = 20
ORDER BY aal.created_at DESC;

-- ============================================================================
-- CONSTRAINTS REFERENCE
-- ============================================================================

PRIMARY KEYS:
  All tables: id SERIAL PRIMARY KEY

UNIQUE:
  users.email
  courses.code
  applications.national_id
  (course_id, student_id) in course_enrollments
  (entity_type, entity_id, attribute_id) in eav_values

CHECK CONSTRAINTS:
  courses.credits >= 1 AND credits <= 6
  courses.capacity >= 1
  applications.gpa >= 0 AND gpa <= 4
  applications.test_score >= 0 AND test_score <= 100
  course_materials.type IN ('pdf', 'video', 'document', 'presentation', 'link')

FOREIGN KEYS:
  users.role_id → roles.id (ON DELETE RESTRICT)
  courses.instructor_id → users.id (ON DELETE SET NULL)
  assignments.course_id → courses.id (ON DELETE CASCADE)
  grades.course_id → courses.id (ON DELETE CASCADE)
  grades.assignment_id → assignments.id (ON DELETE CASCADE)
  grades.student_id → users.id (ON DELETE CASCADE)
  course_enrollments.course_id → courses.id (ON DELETE CASCADE)
  course_enrollments.student_id → users.id (ON DELETE CASCADE)
  course_tags.course_id → courses.id (ON DELETE CASCADE)
  course_tags.tag_id → tags.id (ON DELETE RESTRICT)
  course_materials.course_id → courses.id (ON DELETE CASCADE)
  refresh_tokens.user_id → users.id (ON DELETE CASCADE)
  application_documents.application_id → applications.id (ON DELETE CASCADE)
  application_activity_logs.application_id → applications.id (ON DELETE CASCADE)
  application_activity_logs.staff_id → users.id (ON DELETE SET NULL)
  application_notifications.application_id → applications.id (ON DELETE CASCADE)
  eav_values.attribute_id → eav_attributes.id (ON DELETE CASCADE)

-- ============================================================================
-- MIGRATION CHECKLIST
-- ============================================================================

- [ ] Run schema.sql to create all 16 tables (plus view)
- [ ] Verify: SELECT count(*) FROM information_schema.tables WHERE table_schema='public'
- [ ] Insert roles: INSERT INTO roles (name) VALUES ('student'), ('admin'), ('staff'), ('parent')
- [ ] Insert eav_attributes (7 predefined attributes)
- [ ] Test: INSERT 1 user with role_id
- [ ] Test: Insert 1 eav_value (staffType for a user)
- [ ] Verify FKs work: Try deleting a role (should fail if users assigned)
- [ ] Load MongoDB data via application layer or bulk script
- [ ] Validate: Row counts match MongoDB → SQL
- [ ] Validate: No NULL values in NOT NULL columns
- [ ] Validate: Constraints pass (GPA 0-4, credits 1-6, etc)

-- ============================================================================
-- DIFFERENCES FROM MONGODB
-- ============================================================================

MongoDB → SQL Changes:

User.role (enum string)
  MongoDB: "student" | "admin" | "staff" | "parent"
  SQL: users.role_id → roles.id (foreign key)
  Query: JOIN roles, no string matching

User.staffType (embedded in doc)
  MongoDB: "admissions" | "other" | null
  SQL: eav_values table (only for staff users)
  Query: JOIN eav_values + eav_attributes, more complex

User.refreshTokens[] (embedded array)
  MongoDB: [{token, createdAt}, ...]
  SQL: refresh_tokens table (1 row per token)
  Query: More efficient filtering by token

Course.materials[] (embedded array of objects)
  MongoDB: [{title, type, fileUrl, ...}, ...]
  SQL: course_materials table (1 row per material)
  Query: Simpler: SELECT FROM course_materials WHERE course_id = X

Course.students[] (array of ObjectIds)
  MongoDB: [ObjectId, ObjectId, ...]
  SQL: course_enrollments table (1 row per enrollment)
  Query: SELECT FROM course_enrollments WHERE course_id = X

Course.tags[] (array of strings)
  MongoDB: ["python", "beginner", ...]
  SQL: tags table + course_tags junction
  Query: Normalized, no string duplication

Application.certificates[] + documents[]
  MongoDB: Two separate arrays
  SQL: Single application_documents table, filtered by document_type
  Query: Simpler schema, single table

Application.activityLogs[]
  MongoDB: [{staffId, action, note, timestamp}, ...]
  SQL: application_activity_logs table
  Query: Proper audit trail with FK to users

-- ============================================================================
-- END QUICK REFERENCE
-- ============================================================================

/*
ENTITY RELATIONSHIP DIAGRAM (ERD)
==================================

┌─────────────────────────────────────────────────────────────────────────────┐
│                         CORE ENTITIES (No EAV)                             │
├─────────────────────────────────────────────────────────────────────────────┤

  ┌──────────┐         ┌──────────┐         ┌─────────────┐
  │  users   │───────→ │ courses  │───────→ │ assignments │
  │          │         │          │         │             │
  │ id (PK)  │         │ id (PK)  │         │ id (PK)     │
  │ email    │         │ code     │         │ course_id   │
  │ password │         │ enrolled │         │ due_date    │
  │ role     │         │ capacity │         │ total_pts   │
  └──────────┘         └──────────┘         └─────────────┘
       │                     │                       │
       │                     └───────────────────────┴───────────┐
       │                                                          │
       │                                              ┌──────────▼────────┐
       │                                              │     grades       │
       │                                              │                  │
       │                                              │ id (PK)          │
       │                                              │ course_id (FK)   │
       │                                              │ assignment_id    │
       │────────────────────────────────────────────→│ student_id (FK)  │
                                                      │ points           │
                                                      └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      ROLES (Single Role per User)                           │
├─────────────────────────────────────────────────────────────────────────────┤

  ┌──────────┐                         ┌──────────┐
  │  users   │────────────────────────→│  roles   │
  │          │   FK: users.role_id     │          │
  │ id (PK)  │                         │ id (PK)  │
  │ role_id  │                         │ name     │
  └──────────┘                         └──────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                   ENROLLMENT & TRACKING TABLES                              │
├─────────────────────────────────────────────────────────────────────────────┤

  ┌──────────┐         ┌──────────────────┐         ┌──────────┐
  │  users   │◄───────→│ course_enrollments│◄───────→│ courses  │
  │          │         │                  │         │          │
  │ id (PK)  │  M-to-M │ student_id (FK)  │  M-to-M │ id (PK)  │
  │          │         │ course_id (FK)   │         │ enrolled │
  └──────────┘         │ enrolled_at      │         └──────────┘
                       └──────────────────┘               │
                                                          │ 1-to-M
                                                          │
  ┌────────────┐                              ┌──────────▼─────────┐
  │   tags     │◄──────────────────────────→  │ course_materials   │
  │            │                              │                    │
  │ id (PK)    │          M-to-M              │ course_id (FK)     │
  │ name       │                              │ title              │
  └────────────┘         ┌──────────────────┐ │ type               │
       ▲                 │ course_tags      │ │ file_url           │
       │                 │                  │ └────────────────────┘
       └────────────────→│ course_id (FK)   │
                         │ tag_id (FK)      │
                         └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      APPLICATION TRACKING TABLES                            │
├─────────────────────────────────────────────────────────────────────────────┤

  ┌───────────────┐
  │ applications  │
  │               │
  │ id (PK)       │
  │ national_id   │
  │ status        │
  └───────┬──────┬┘
          │      │
      1-M │      │ 1-M
          │      │
          │      ├──→ ┌──────────────────────────┐
          │      │    │application_notifications│
          │      │    │                          │
          │      │    │ application_id (FK)      │
          │      │    │ type                     │
          │      │    │ delivered                │
          │      │    └──────────────────────────┘
          │      │
          ├──────┴──→ ┌──────────────────────────┐
          │           │application_activity_logs │
          │           │                          │
          │           │ application_id (FK)      │
          │           │ staff_id (FK)            │
          │           │ action                   │
          │           └──────────────────────────┘
          │
          └──────────→ ┌──────────────────────────┐
                       │application_documents     │
                       │                          │
                       │ application_id (FK)      │
                       │ document_type            │
                       │ url                      │
                       └──────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         EAV SUBSYSTEM (Typed)                               │
├─────────────────────────────────────────────────────────────────────────────┤

  ┌──────────────────────┐         ┌───────────────────┐
  │ eav_attributes       │         │   eav_values      │
  │                      │         │                   │
  │ id (PK)              │         │ id (PK)           │
  │ entity_type          │         │ attribute_id (FK) │
  │ attribute_name       │◄────────┤ entity_type       │
  │ data_type            │         │ entity_id         │
  │ is_searchable        │         │ string_value      │
  │ is_indexed           │         │ integer_value     │
  │                      │         │ decimal_value     │
  │ (7 pre-defined attrs)│         │ boolean_value     │
  └──────────────────────┘         │ datetime_value    │
                                    │ json_value        │
                                    └───────────────────┘
                                           ▲
                                           │ FK to
                    ┌──────────────────────┘
                    │
     References:  users (entity_type='user')
                  courses (entity_type='course')
                  applications (entity_type='application')
*/

-- ============================================================================
-- TABLE STATISTICS & ROW COUNT ESTIMATES
-- ============================================================================

/*
Table Name                          Size (est.)   Row Count (est.)  Indexes
─────────────────────────────────────────────────────────────────────────────
Core Entities
  users                             1-10 MB       1,000-10,000      3
  courses                           500 KB-2 MB   50-500            4
  assignments                       1-5 MB        100-1,000         2
  grades                            5-50 MB       1,000-50,000      3
  applications                      2-10 MB       100-1,000         4

Role Management
  roles                             5 KB          4                 1
  -- single-role model; no user_roles/staff_metadata tables

Enrollment & Tracking
  refresh_tokens                    2-10 MB       5,000-50,000      3
  course_enrollments                2-10 MB       500-5,000         2
  tags                              50 KB         50-500            1
  course_tags                       500 KB-2 MB   200-2,000         2
  course_materials                  1-5 MB        200-2,000         3

Application Tracking
  application_documents             1-5 MB        500-5,000         2
  application_activity_logs         1-5 MB        500-5,000         2
  application_notifications         500 KB-2 MB   1,000-5,000       2

EAV System
  eav_attributes                    10 KB         7-20              1
  eav_values                        1-5 MB        1,000-10,000      3 (incl. partial idx for courses)

Lookup Tables
  (none required, but could add):
    - application_statuses: 3 rows
    - document_types: 2 rows
    - material_types: 5 rows

TOTAL ESTIMATED DB SIZE: 20-150 MB (depends on actual user base)
*/

-- ============================================================================
-- QUICK QUERY PATTERNS
-- ============================================================================

-- Query Pattern 1: Get all courses for a student
SELECT DISTINCT c.*
FROM courses c
JOIN course_enrollments ce ON c.id = ce.course_id
WHERE ce.student_id = ?;

-- Query Pattern 2: Get grades for a specific student in a course
SELECT a.title, g.points, g.feedback
FROM grades g
JOIN assignments a ON g.assignment_id = a.id
WHERE g.student_id = ? AND g.course_id = ?
ORDER BY a.due_date;

-- Query Pattern 3: Get the role for a user (single role)
SELECT r.name
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.id = ?;

-- Query Pattern 4: Find courses with available capacity
SELECT code, name, (capacity - enrolled) as available
FROM courses
WHERE status = 'published' AND enrolled < capacity
ORDER BY available DESC;

-- Query Pattern 5: Get application decision history
SELECT aal.action, u.name as staff_name, aal.note, aal.created_at
FROM application_activity_logs aal
LEFT JOIN users u ON aal.staff_id = u.id
WHERE aal.application_id = ?
ORDER BY aal.created_at DESC;

-- Query Pattern 6: Retrieve user dynamic metadata (EAV)
SELECT ea.attribute_name, 
       COALESCE(ev.string_value, 
                ev.integer_value::text,
                ev.decimal_value::text,
                ev.boolean_value::text,
                ev.datetime_value::text) as value
FROM eav_values ev
JOIN eav_attributes ea ON ev.attribute_id = ea.id
WHERE ev.entity_type = 'user' AND ev.entity_id = ?;

-- Query Pattern 6b: Retrieve course metadata (via view)
SELECT meta_key, meta_value
FROM vw_course_metadata
WHERE course_id = ?
ORDER BY meta_key;

-- Query Pattern 7: Count students enrolled in a course
SELECT COUNT(*) as total_enrolled
FROM course_enrollments
WHERE course_id = ?;

-- Query Pattern 8: Find courses taught by an instructor
SELECT * FROM courses WHERE instructor_id = ? ORDER BY code;

-- ============================================================================
-- CONSTRAINTS REFERENCE
-- ============================================================================

/*
PRIMARY KEY CONSTRAINTS:
  Every table has: id SERIAL PRIMARY KEY

UNIQUE CONSTRAINTS:
  users.email UNIQUE
  courses.code UNIQUE
  applications.national_id UNIQUE
  -- single-role model (no user_roles table)
  eav_values(entity_type, entity_id, attribute_id) UNIQUE

CHECK CONSTRAINTS (Domain Rules):
  courses.credits CHECK (credits >= 1 AND credits <= 6)
  courses.capacity CHECK (capacity >= 1)
  courses.enrolled CHECK (enrolled >= 0)
  courses.status CHECK (status IN ('draft', 'published', 'archived'))
  applications.gpa CHECK (gpa >= 0 AND gpa <= 4)
  applications.test_score CHECK (test_score >= 0 AND test_score <= 100)
  applications.age CHECK (age > 0)
  applications.application_status CHECK (application_status IN ('pending', 'approved', 'rejected'))
  assignments.total_points CHECK (total_points > 0)
  course_materials.type CHECK (type IN ('pdf', 'video', 'document', 'presentation', 'link'))
  -- staffType stored in EAV for staff users

NOT NULL CONSTRAINTS:
  See schema.sql for complete list (all required fields marked NOT NULL)

FOREIGN KEY CONSTRAINTS:
  See schema.sql for complete list with ON DELETE behavior
  Common patterns:
    - ON DELETE CASCADE: Dependent records deleted with parent
    - ON DELETE SET NULL: FK cleared when parent deleted (optional FKs)
    - ON DELETE RESTRICT: Parent deletion blocked if dependent records exist
*/

-- ============================================================================
-- SUPABASE DEPLOYMENT NOTES
-- ============================================================================

/*
1. AUTHENTICATION:
   - Supabase provides built-in auth with JWT tokens
   - Consider integrating Supabase Auth instead of custom refreshTokens?
   - If keeping refreshTokens: store in refresh_tokens table

2. ROW-LEVEL SECURITY (RLS):
   - Enable RLS for sensitive tables (users, grades, applications)
   - Example: Students can only see their own grades
   - Example: Staff can only see applications assigned to them

3. REALTIME SUBSCRIPTIONS:
   - Supabase supports real-time updates via WebSockets
   - Useful for: application status updates, grade notifications

4. BACKUPS:
   - Supabase handles daily backups automatically
   - Configure backup schedule in Supabase dashboard

5. MONITORING:
   - Monitor query performance via Supabase logs
   - Check slow queries: pg_stat_statements
   - Monitor connection count for pgBouncer limits

6. MIGRATIONS:
   - Use Supabase Migrations (runs SQL against DB)
   - Version control DDL changes
   - Use: supabase migration new <name>

7. EXAMPLE RLS POLICY:
   
   -- Allow users to see their own profile
   CREATE POLICY "Users can view own profile"
   ON users FOR SELECT
   USING (auth.uid() = id::text);  -- Adjust based on auth implementation

   -- Allow students to see their own grades
   CREATE POLICY "Students see own grades"
   ON grades FOR SELECT
   USING (student_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email'));
*/

-- ============================================================================
-- SUPABASE INITIALIZATION SCRIPT
-- ============================================================================

/*
Steps to deploy to Supabase:

1. Create PostgreSQL database in Supabase console
2. Copy full schema.sql contents
3. Open SQL Editor in Supabase
4. Paste and execute schema.sql
5. Verify tables created: \dt in SQL editor
6. Insert reference data (roles):
   
   INSERT INTO roles (name, description) VALUES
     ('student', 'Student user with course enrollment and grade access'),
     ('admin', 'Administrator with full system access'),
     ('staff', 'Staff member with specific departmental access'),
     ('parent', 'Parent/guardian with limited student view access');

7. Insert EAV attributes (from schema.sql INSERT statements)

8. Test connectivity from application layer

9. Run data migration scripts (separate tool)

10. Run validation queries to ensure data integrity
*/

-- ============================================================================
-- END OF QUICK REFERENCE
-- ============================================================================
