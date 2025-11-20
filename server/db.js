const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS applications (
      nationalId TEXT PRIMARY KEY,
      studentName TEXT,
      email TEXT,
      phoneNumber TEXT,
      appliedProgram TEXT,
      gpa REAL,
      testScore INTEGER,
      age INTEGER,
      idPhoto TEXT,
      selfiePhoto TEXT,
      certificates TEXT,
      documents TEXT,
      submittedAt TEXT,
      applicationStatus TEXT,
      rejectionReason TEXT
    )
  `);
});

const run = (sql, params = []) =>
  new Promise((resolve, reject) => db.run(sql, params, function (err) {
    if (err) return reject(err);
    resolve(this);
  }));

const get = (sql, params = []) =>
  new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));

const all = (sql, params = []) =>
  new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));

async function insertApplication(app) {
  const sql = `INSERT INTO applications
    (nationalId,studentName,email,phoneNumber,appliedProgram,gpa,testScore,age,idPhoto,selfiePhoto,certificates,documents,submittedAt,applicationStatus,rejectionReason)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  const params = [
    app.nationalId,
    app.studentName,
    app.email,
    app.phoneNumber,
    app.appliedProgram,
    app.gpa !== undefined ? Number(app.gpa) : null,
    app.testScore !== undefined ? Number(app.testScore) : null,
    app.age !== undefined ? Number(app.age) : null,
    app.idPhoto,
    app.selfiePhoto,
    JSON.stringify(app.certificates || []),
    JSON.stringify(app.documents || []),
    app.submittedAt,
    app.applicationStatus || 'pending',
    app.rejectionReason || null,
  ];
  await run(sql, params);
  return getApplicationById(app.nationalId);
}

async function getApplicationById(nationalId) {
  const row = await get(`SELECT * FROM applications WHERE nationalId = ?`, [nationalId]);
  return normalizeRow(row);
}

async function getAllApplications() {
  const rows = await all(`SELECT * FROM applications ORDER BY submittedAt DESC`, []);
  return rows.map(normalizeRow);
}

async function findByNationalId(nationalId) {
  const row = await get(`SELECT * FROM applications WHERE nationalId = ? LIMIT 1`, [nationalId]);
  return normalizeRow(row);
}

function normalizeRow(row) {
  if (!row) return null;
  return {
    id: row.nationalId,
    nationalId: row.nationalId,
    studentName: row.studentName,
    email: row.email,
    phoneNumber: row.phoneNumber,
    appliedProgram: row.appliedProgram,
    gpa: row.gpa !== null && row.gpa !== undefined ? Number(row.gpa) : null,
    testScore: row.testScore !== null && row.testScore !== undefined ? Number(row.testScore) : null,
    age: row.age !== null && row.age !== undefined ? Number(row.age) : null,
    idPhoto: row.idPhoto,
    selfiePhoto: row.selfiePhoto,
    certificates: tryParseJson(row.certificates),
    documents: tryParseJson(row.documents),
    submittedAt: row.submittedAt,
    applicationStatus: row.applicationStatus,
    rejectionReason: row.rejectionReason,
  };
}

function tryParseJson(v) {
  if (!v) return [];
  try {
    return JSON.parse(v);
  } catch (e) {
    return [];
  }
}

module.exports = {
  insertApplication,
  getApplicationById,
  getAllApplications,
  findByNationalId,
};
  findByNationalId,
};
