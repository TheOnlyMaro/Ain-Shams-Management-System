const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentName TEXT,
      email TEXT,
      phoneNumber TEXT,
      appliedProgram TEXT,
      gpa TEXT,
      testScore TEXT,
      age TEXT,
      nationalId TEXT,
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
    (studentName,email,phoneNumber,appliedProgram,gpa,testScore,age,nationalId,idPhoto,selfiePhoto,certificates,documents,submittedAt,applicationStatus,rejectionReason)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  const params = [
    app.studentName,
    app.email,
    app.phoneNumber,
    app.appliedProgram,
    app.gpa,
    app.testScore,
    app.age,
    app.nationalId,
    app.idPhoto,
    app.selfiePhoto,
    JSON.stringify(app.certificates || []),
    JSON.stringify(app.documents || []),
    app.submittedAt,
    app.applicationStatus || 'pending',
    app.rejectionReason || null,
  ];
  const result = await run(sql, params);
  const id = result.lastID;
  return getApplicationById(id);
}

async function getApplicationById(id) {
  const row = await get(`SELECT * FROM applications WHERE id = ?`, [id]);
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
    id: row.id,
    studentName: row.studentName,
    email: row.email,
    phoneNumber: row.phoneNumber,
    appliedProgram: row.appliedProgram,
    gpa: row.gpa,
    testScore: row.testScore,
    age: row.age,
    nationalId: row.nationalId,
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
};
