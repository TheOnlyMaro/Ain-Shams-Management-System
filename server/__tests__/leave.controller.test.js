const { execSync } = require('child_process');
const path = require('path');
// Load root .env so SUPABASE_DB_URL is available to this process
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Ensure tests run against isolated test schema
process.env.TEST_SCHEMA = 'test';

beforeAll(() => {
  // apply schema into test schema
  execSync('node server/scripts/apply-schema-test.js', { stdio: 'inherit' });
});

let db;
let leaveController;
let studentId;
let staffId;

// small response mock
function mockRes() {
  let status = 200;
  let body = null;
  return {
    status(code) { status = code; return this; },
    json(obj) { body = obj; return { status, body }; },
    send() { return { status }; }
  };
}

beforeAll(async () => {
  db = require('../db/sql');
  leaveController = require('../controllers-sql/leaveController');

  // ensure roles exist and create test users
  const rStudent = await db.query("SELECT id FROM roles WHERE name='student' LIMIT 1");
  const rStaff = await db.query("SELECT id FROM roles WHERE name='staff' LIMIT 1");
  const studentRoleId = rStudent.rows[0].id;
  const staffRoleId = rStaff.rows[0].id;

  const ins1 = await db.query(
    `INSERT INTO users(name,email,password,phone,role_id) VALUES('Test Student','student@example.test','x','', $1) RETURNING id`,
    [studentRoleId]
  );
  studentId = ins1.rows[0].id;

  const ins2 = await db.query(
    `INSERT INTO users(name,email,password,phone,role_id) VALUES('Test Staff','staff@example.test','x','', $1) RETURNING id`,
    [staffRoleId]
  );
  staffId = ins2.rows[0].id;
});

afterAll(async () => {
  if (db && db.query) {
    try {
      await db.query('DROP SCHEMA IF EXISTS test CASCADE');
      if (db.pool && db.pool.end) await db.pool.end();
    } catch (e) {
      // ignore
    }
  }
});

test('student can create leave request (pending)', async () => {
  const req = { body: { startDate: new Date(Date.now()+3600*1000).toISOString(), endDate: new Date(Date.now()+86400*1000).toISOString(), leaveType: 'vacation', reason: 'Trip' }, user: { id: studentId, role: 'student' } };
  const res = mockRes();
  const result = await leaveController.createLeave(req, res);
  // controller returns res.status so our mock returns object
  // fetch from DB to verify
  const q = await db.query('SELECT * FROM leave_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [studentId]);
  expect(q.rowCount).toBeGreaterThan(0);
  const row = q.rows[0];
  expect(row.user_id).toBe(studentId);
  expect(row.status).toBe('pending');
});

test('staff can approve leave request', async () => {
  // create a leave to approve
  const ins = await db.query(
    `INSERT INTO leave_requests(user_id, start_date, end_date, leave_type, reason, status) VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *`,
    [studentId, new Date().toISOString(), new Date(Date.now()+3600*1000).toISOString(), 'sick', 'Illness']
  );
  const leaveId = ins.rows[0].id;

  const req = { params: { leaveId: String(leaveId) }, body: { status: 'approved', approverNote: 'OK' }, user: { id: staffId, role: 'staff' } };
  const res = mockRes();
  const result = await leaveController.updateLeave(req, res);
  const q = await db.query('SELECT * FROM leave_requests WHERE id=$1', [leaveId]);
  expect(q.rowCount).toBe(1);
  expect(q.rows[0].status).toBe('approved');
  expect(q.rows[0].approver_id).toBe(staffId);
});

test('student cannot change status (forbidden)', async () => {
  const ins = await db.query(
    `INSERT INTO leave_requests(user_id, start_date, end_date, leave_type, reason, status) VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *`,
    [studentId, new Date().toISOString(), new Date(Date.now()+3600*1000).toISOString(), 'personal', 'Errand']
  );
  const leaveId = ins.rows[0].id;
  const req = { params: { leaveId: String(leaveId) }, body: { status: 'approved' }, user: { id: studentId, role: 'student' } };
  const res = mockRes();
  const result = await leaveController.updateLeave(req, res);
  // expect 403 by inspecting DB (status remains pending)
  const q = await db.query('SELECT status FROM leave_requests WHERE id=$1', [leaveId]);
  expect(q.rows[0].status).toBe('pending');
});

test('owner can delete their leave', async () => {
  const ins = await db.query(
    `INSERT INTO leave_requests(user_id, start_date, end_date, leave_type, reason, status) VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *`,
    [studentId, new Date().toISOString(), new Date(Date.now()+3600*1000).toISOString(), 'vacation', 'Del']
  );
  const leaveId = ins.rows[0].id;
  const req = { params: { leaveId: String(leaveId) }, user: { id: studentId, role: 'student' } };
  const res = mockRes();
  await leaveController.deleteLeave(req, res);
  const q = await db.query('SELECT * FROM leave_requests WHERE id=$1', [leaveId]);
  expect(q.rowCount).toBe(0);
});
