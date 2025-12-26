const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
let db;
let pc;

function makeMockReq(body = {}, params = {}, query = {}) {
  return { body, params, query, headers: {} };
}

function makeMockRes() {
  const res = {};
  res.statusCode = 200;
  res.status = function (c) { this.statusCode = c; return this; };
  res.json = function (obj) { this._body = obj; return this; };
  res.send = function (obj) { this._body = obj; return this; };
  return res;
}

async function callController(fn, req) {
  const res = makeMockRes();
  await fn(req, res);
  return res;
}

describe('Payroll controllers (integration)', () => {
  let createdRunId;
  let createdEntryId;

  beforeAll(async () => {
    process.env.TEST_SCHEMA = 'test';
    const { execSync } = require('child_process');
    execSync('node server/scripts/apply-schema-test.js', { stdio: 'inherit' });
    db = require('../db/sql');
    pc = require('../controllers-sql/payrollController');
    await db.query('SELECT 1');
  });

  afterAll(async () => {
    if (db.pool && typeof db.pool.end === 'function') await db.pool.end();
  });

  test('create payrun and add entry/component then finalize', async () => {
    const start = new Date().toISOString().slice(0,10);
    const end = start;
    const createRes = await callController(pc.createPayrun, makeMockReq({ periodStart: start, periodEnd: end, notes: 'Jest payrun' }));
    expect(createRes.statusCode).toBe(201);
    createdRunId = createRes._body.data.id;

    const addEntryRes = await callController(pc.addEntry, makeMockReq({ userId: 1, grossAmount: '1000.00' }, { payrunId: createdRunId }));
    expect(addEntryRes.statusCode).toBe(201);
    createdEntryId = addEntryRes._body.data.id;

    const addComp1 = await callController(pc.addComponent, makeMockReq({ componentType: 'base_salary', amount: '1000.00', taxable: true }, { entryId: createdEntryId }));
    expect(addComp1.statusCode).toBe(201);
    const addComp2 = await callController(pc.addComponent, makeMockReq({ componentType: 'tax', amount: '-200.00', taxable: true }, { entryId: createdEntryId }));
    expect(addComp2.statusCode).toBe(201);

    const finalize = await callController(pc.finalizePayrun, makeMockReq({}, { payrunId: createdRunId }));
    expect(finalize.statusCode).toBe(200);
    expect(finalize._body.data.status).toBe('finalized');
    const entry = finalize._body.data.entries.find(e => e.id === createdEntryId);
    expect(entry).toBeDefined();
    // net should be sum of components: 1000 + (-200) = 800
    expect(Number(entry.net_amount)).toBeCloseTo(800, 2);

    // cleanup
    await db.query('DELETE FROM payroll_runs WHERE id=$1', [createdRunId]);
  });
});
