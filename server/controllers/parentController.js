const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

// Connect Parent to Child
// Criteria: Child Name, National ID, System ID (or Email, checking implementation), Phone, Parent National ID
exports.connectChild = async (req, res) => {
  const parentId = req.user.id; // From auth middleware
  const { child_name, child_national_id, child_id, child_phone, parent_national_id } = req.body;

  // Basic validation
  if (!child_name || !child_national_id || !child_id || !child_phone || !parent_national_id) {
    return res.status(400).json({ 
      message: 'All fields are required: child_name, child_national_id, child_id, child_phone, parent_national_id' 
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify Parent's National ID
    // If parent doesn't have one set, we update it. If they do, we enforce match.
    const parentRes = await client.query('SELECT national_id FROM users WHERE id = $1', [parentId]);
    const currentParentNID = parentRes.rows[0]?.national_id;

    if (currentParentNID && currentParentNID !== parent_national_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Provided National ID does not match your verify profile.' });
    }

    if (!currentParentNID) {
        // Set it now
        await client.query('UPDATE users SET national_id = $1 WHERE id = $2', [parent_national_id, parentId]);
    }

    // 2. Find Student with ALL matching criteria
    // We assume 'child_id' refers to the primary key 'id' of the users table for the student.
    // If 'child_id' means university ID (like 'email' prefix or a specific field), we might need to adjust.
    // Assuming 'users.id' for now based on typical linking.
    const studentQuery = `
      SELECT id FROM users 
      WHERE id = $1 
      AND name = $2 
      AND national_id = $3 
      AND phone = $4
      AND role_id = (SELECT id FROM roles WHERE name = 'student')
    `;
    
    // Note: Phone comparison might need normalization (spaces, dashes), doing exact match for specific requirement first.
    const studentRes = await client.query(studentQuery, [child_id, child_name, child_national_id, child_phone]);

    if (studentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'No student found matching ALL provided specific details.' });
    }

    const studentId = studentRes.rows[0].id;

    // 3. Create Link
    // Check if already connected
    const existingLink = await client.query(
        'SELECT id FROM parent_students WHERE parent_id = $1 AND student_id = $2', 
        [parentId, studentId]
    );

    if (existingLink.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'You are already connected to this student.' });
    }

    await client.query(
        'INSERT INTO parent_students (parent_id, student_id) VALUES ($1, $2)',
        [parentId, studentId]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Successfully connected to student.' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Connect child error:', err);
    res.status(500).json({ message: 'Server error connecting to student.' });
  } finally {
    client.release();
  }
};

// Get Connected Children
exports.getChildren = async (req, res) => {
  const parentId = req.user.id;
  
  try {
    const query = `
      SELECT u.id, u.name, u.email, u.phone, u.national_id 
      FROM users u
      JOIN parent_students ps ON u.id = ps.student_id
      WHERE ps.parent_id = $1
    `;
    const result = await pool.query(query, [parentId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get children error:', err);
    res.status(500).json({ message: 'Server error fetching children.' });
  }
};

// Get Child's Progress (Grades)
exports.getChildProgress = async (req, res) => {
  const parentId = req.user.id;
  const studentId = req.params.studentId;

  try {
    // 1. Verify link exists
    const linkCheck = await pool.query(
        'SELECT 1 FROM parent_students WHERE parent_id = $1 AND student_id = $2',
        [parentId, studentId]
    );

    if (linkCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Not authorized to view this student\'s data.' });
    }

    // 2. Fetch Grades
    // Similar to a student viewing their own grades, but for a specific student_id
    const gradesQuery = `
      SELECT 
        c.code AS course_code,
        c.name AS course_name,
        a.title AS assignment_title,
        a.total_points,
        g.points AS student_score,
        g.feedback
      FROM grades g
      JOIN assignments a ON g.assignment_id = a.id
      JOIN courses c ON g.course_id = c.id
      WHERE g.student_id = $1
      ORDER BY c.code, a.due_date DESC
    `;
    
    const gradesRes = await pool.query(gradesQuery, [studentId]);

    // Optional: Group by course for cleaner frontend consumption?
    // Returning flat list for now or could format structure.
    
    res.json(gradesRes.rows);

  } catch (err) {
    console.error('Get child progress error:', err);
    res.status(500).json({ message: 'Server error fetching progress.' });
  }
};
