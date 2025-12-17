# SQL Schema Design - Migration Notes

## Overview
16 PostgreSQL tables migrating from MongoDB Atlas. All fields are NOT NULL with sensible defaults.

## Key Design Decisions

### 1. Single Role (Not Multi-Role)
- `users.role_id` points to `roles` table
- One role per user (removed user_roles junction table)
- Simpler queries, clearer semantics

### 2. staffType → EAV
- Moved to `eav_values` table (entity_type='user', attribute_name='staffType')
- Only staff users have this attribute (no nulls in main users table)
- Rationale: Optional for most users, valuable for a few

### 3. All Fields NOT NULL
- Added defaults for optional-seeming fields:
  - Empty strings (`''`) for text fields
  - `0` for numeric fields
  - `'2099-12-31'` for timestamp fields that can be "unset"
- Eliminates null handling in application logic
- Simpler queries and fewer edge cases

### 4. No Multi-Role Junction Table
- Removed `user_roles` table
- Direct `role_id` foreign key in `users` table
- Cleaner queries for common case (one role per user)

### 5. Core Entities Remain Relational
- **Not EAV:** users, courses, assignments, grades, applications
- **Is EAV:** staffType, LMS metadata, dynamic user preferences

## Table Structure

### Users & Roles
```
roles (id, name)
users (id, name, email, password, phone, role_id, created_at, updated_at)
```

### Course Management
```
courses (id, code, name, instructor_id, schedule, capacity, enrolled, status, ...)
course_enrollments (id, course_id, student_id, enrolled_at, completed_at)
assignments (id, course_id, title, due_date, total_points, ...)
grades (id, course_id, assignment_id, student_id, points, feedback, ...)
course_materials (id, course_id, title, type, file_url, ...)
course_tags (id, course_id, tag_id)
tags (id, name)
```

### Applications
```
applications (id, student_name, email, national_id, gpa, test_score, status, ...)
application_documents (id, application_id, document_type, url, ...)
application_activity_logs (id, application_id, staff_id, action, note, ...)
application_notifications (id, application_id, type, message, sent_at, delivered)
```

### Tokens
```
refresh_tokens (id, user_id, token, created_at, expires_at, revoked_at)
```

### Dynamic Metadata (EAV)
```
eav_attributes (id, entity_type, attribute_name, data_type, is_searchable, ...)
eav_values (id, entity_type, entity_id, attribute_id, string_value, integer_value, ...)
vw_course_metadata (view: course_id, meta_key, meta_value)
```

## MongoDB → SQL Mapping

| MongoDB Field | SQL Location | Notes |
|---|---|---|
| User.role (enum) | users.role_id (FK) | Single role per user |
| User.staffType | eav_values (staffType attr) | Only for staff users |
| User.refreshTokens[] | refresh_tokens table | One row per token |
| User.specialInfo | eav_values (optional) | Dynamic metadata |
| Course.metadata.* | courses columns | Flattened: department, level, semester |
| Course.materials[] | course_materials table | One row per material |
| Course.students[] | course_enrollments table | M-to-M junction |
| Course.tags[] | course_tags + tags | Normalized tags |
| Application.certificates[] | application_documents | document_type='certificate' |
| Application.documents[] | application_documents | document_type='document' |
| Application.activityLogs[] | application_activity_logs | One row per action |
| Application.notifications[] | application_notifications | One row per notification |

## NOT NULL Strategy

Instead of nullable fields, use defaults:

```sql
phone VARCHAR(20) NOT NULL DEFAULT ''
test_score INTEGER NOT NULL DEFAULT 0
completed_at TIMESTAMP NOT NULL DEFAULT '2099-12-31'
description TEXT NOT NULL DEFAULT ''
```

Benefits:
- No NULL checks in application code
- Simpler queries (can use direct comparisons)
- Consistent behavior across rows

## EAV Subsystem (Minimal)

**Pre-populated attributes (7):**
- `staffType` (user) - admissions vs other staff types
- `preferredLanguage` (user) - i18n support
- `lms_external_id` (course) - Canvas/Blackboard IDs
- `lms_sync_metadata` (course) - complex JSON configs
- `custom_field_1` (application) - example extension point
- `canvas_api_key` (lms_integration) - API credentials
- `blackboard_config` (lms_integration) - JSON config

**Why only here?**
- Core entities (users, courses, assignments, grades, applications) have fixed, well-defined schemas
- These 6+ attributes are truly optional and dynamic
- Prevents schema migrations for future extensibility
- Trade-off: JOIN penalties acceptable because queries are non-critical

## Indexes

Created on:
- All primary keys (automatic)
- All foreign keys (for JOIN performance)
- Frequently searched columns: email, code, national_id
- Entity type + ID for EAV lookups

## Constraints

- **UNIQUE:** email, code, national_id, (course_id, student_id), (entity_type, entity_id, attribute_id)
- **CHECK:** credits 1-6, gpa 0-4, test_score 0-100, capacity >= 1
- **NOT NULL:** All fields (with sensible defaults)
- **FOREIGN KEY:** Proper cascading (CASCADE for dependent data, SET NULL for optional FKs)

## Migration Path

1. Initialize PostgreSQL database in Supabase
2. Run `schema.sql` to create all 16 tables (plus view)
3. Insert reference data: roles, eav_attributes
4. Transform MongoDB documents → SQL rows
5. Load data via bulk insert or application layer
6. Verify: row counts, FK integrity, constraints pass
7. Update application code for SQL queries

## Next: Implementation

- Update API endpoints to use SQL queries (via ORM or raw SQL)
- Implement data transformation/migration scripts
- Test application with new schema
- Performance tuning if needed

## Notes on Course Metadata
- Course metadata is stored via EAV (`entity_type='course'`).
- Use `vw_course_metadata` to fetch key/value pairs without manual CASE handling.
- A partial index `idx_eav_values_course` accelerates lookups by attribute.
