const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const connectionString = process.env.SUPABASE_DB_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'replace_me_with_strong_secret';

if (!connectionString) {
  console.error('SUPABASE_DB_URL missing');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    // 1. Ensure Admin User
    const adminEmail = 'admin_test_' + Date.now() + '@test.com';
    const adminRoleRes = await pool.query("SELECT id FROM roles WHERE name = 'admin'");
    const adminRoleId = adminRoleRes.rows[0].id;
    
    const adminInsert = await pool.query(
      "INSERT INTO users (name, email, password, role_id) VALUES ($1, $2, $3, $4) RETURNING id",
      ['Admin Test', adminEmail, 'hashedpassword', adminRoleId]
    );
    const adminId = adminInsert.rows[0].id;
    console.log(`Created Admin: ${adminEmail} (ID: ${adminId})`);

    // 2. Ensure Student User
    const studentEmail = 'student_test_' + Date.now() + '@test.com';
    const studentRoleRes = await pool.query("SELECT id FROM roles WHERE name = 'student'");
    const studentRoleId = studentRoleRes.rows[0].id;
    
    const studentInsert = await pool.query(
      "INSERT INTO users (name, email, password, role_id) VALUES ($1, $2, $3, $4) RETURNING id",
      ['Student Test', studentEmail, 'hashedpassword', studentRoleId]
    );
    const studentId = studentInsert.rows[0].id;
    console.log(`Created Student: ${studentEmail} (ID: ${studentId})`);

    // 3. Generate Tokens
    const adminToken = jwt.sign({ id: adminId, email: adminEmail, role: 'admin' }, JWT_SECRET);
    const studentToken = jwt.sign({ id: studentId, email: studentEmail, role: 'student' }, JWT_SECRET);

    // 4. Test Create Course (Admin)
    const courseCode = 'CS' + Math.floor(Math.random() * 10000);
    const createPayload = {
      code: courseCode,
      name: 'Test Course SQL',
      description: 'A test course',
      instructorName: 'Dr. Test', // Note: Validator checks this, but mapper might miss it
      instructorEmail: 'dr.test@university.edu',
      schedule: 'Mon/Wed 10:00',
      credits: 3,
      capacity: 30,
      status: 'published'
    };

    console.log('Creating course...');
    const createRes = await fetch('http://127.0.0.1:4000/api/curriculum/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify(createPayload)
    });
    
    const createData = await createRes.json();
    console.log('Create Response:', createRes.status, JSON.stringify(createData, null, 2));

    if (!createData.success) {
        console.error('Failed to create course');
        process.exit(1);
    }
    const courseId = createData.data.id;

    // 5. Test Update Course (Admin)
    console.log('Updating course...');
    const updatePayload = {
      ...createPayload, // Send full payload to avoid overwriting with nulls for now
      name: 'Test Course SQL Updated',
      instructorName: 'Dr. Updated'
    };
    const updateRes = await fetch(`http://127.0.0.1:4000/api/curriculum/courses/${courseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify(updatePayload)
    });
    const updateData = await updateRes.json();
    console.log('Update Response:', updateRes.status, updateData.success);

    // 6. Test Enroll (Student)
    console.log('Enrolling student...');
    const enrollRes = await fetch(`http://127.0.0.1:4000/api/curriculum/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
      body: JSON.stringify({ studentId: studentId })
    });
    const enrollData = await enrollRes.json();
    console.log('Enroll Response:', enrollRes.status, enrollData.success);

    // 7. Test List Courses (Student) - check if enrolled
    console.log('Listing courses...');
    const listRes = await fetch('http://127.0.0.1:4000/api/curriculum/courses', {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const listData = await listRes.json();
    const foundCourse = listData.data.find(c => c.id === courseId);
    console.log('Course found in list:', !!foundCourse);
    if (foundCourse) {
        console.log('Student ID in course students list:', foundCourse.students.includes(String(studentId)));
    }

    // 7b. Test Enrolled Courses Endpoint
    console.log('Getting enrolled courses for student...');
    const enrolledRes = await fetch(`http://127.0.0.1:4000/api/curriculum/courses/enrolled/${studentId}`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const enrolledData = await enrolledRes.json();
    console.log('Enrolled Courses Response:', enrolledRes.status, enrolledData.success);
    const foundEnrolled = enrolledData.data.find(c => c.id === courseId);
    console.log('Course found in enrolled list:', !!foundEnrolled);

    // 8. Test Unenroll (Student)
    console.log('Unenrolling student...');
    const unenrollRes = await fetch(`http://127.0.0.1:4000/api/curriculum/courses/${courseId}/unenroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
      body: JSON.stringify({ studentId: studentId })
    });
    const unenrollData = await unenrollRes.json();
    console.log('Unenroll Response:', unenrollRes.status, unenrollData.success);

    // 9. Delete Course (Admin)
    console.log('Deleting course...');
    const deleteRes = await fetch(`http://127.0.0.1:4000/api/curriculum/courses/${courseId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('Delete Response:', deleteRes.status);

  } catch (err) {
    console.error('Test Failed:', err);
  } finally {
    await pool.end();
  }
}

main();
