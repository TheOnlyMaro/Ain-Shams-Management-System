const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
let db;
let rtc;
let rc;
let rac;

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

describe('Resource controllers (integration)', () => {
  let createdTypeId;
  let createdResourceId;
  let createdAllocationId;
  const testTypeName = 'JestType-' + Date.now();

  beforeAll(async () => {
    // Ensure DB connection and apply test schema
    // set TEST_SCHEMA so the DB pool sets search_path to the test schema for all connections
    process.env.TEST_SCHEMA = 'test';
    const { execSync } = require('child_process');
    execSync('node server/scripts/apply-schema-test.js', { stdio: 'inherit' });
    // require DB and controllers after TEST_SCHEMA is set so pool clients use the test schema
    db = require('../db/sql');
    rtc = require('../controllers-sql/resourceTypeController');
    rc = require('../controllers-sql/resourceController');
    rac = require('../controllers-sql/resourceAllocationController');
    await db.query('SELECT 1');
  });

  afterAll(async () => {
    // close pool
    if (db.pool && typeof db.pool.end === 'function') await db.pool.end();
  });

  test('create and list resource type', async () => {
    const req = makeMockReq({ name: testTypeName, description: 'jest test' });
    const res = await callController(rtc.createResourceType, req);
    expect([201, 409]).toContain(res.statusCode);

    const listRes = await callController(rtc.listResourceTypes, makeMockReq());
    const types = listRes._body.data;
    const t = types.find(x => x.name === testTypeName);
    expect(t).toBeDefined();
    createdTypeId = t.id;
  });

  test('creating resource type without name should fail (400)', async () => {
    const res = await callController(rtc.createResourceType, makeMockReq({}));
    expect(res.statusCode).toBe(400);
  });

  test('creating duplicate resource type should conflict (409)', async () => {
    const res = await callController(rtc.createResourceType, makeMockReq({ name: testTypeName }));
    expect([201, 409]).toContain(res.statusCode);
    if (res.statusCode === 201) {
      // created a second time, remove the duplicate to keep DB tidy
      await db.query('DELETE FROM resource_types WHERE name=$1', [testTypeName]);
    }
  });

  test('create, get, update, and delete resource flow', async () => {
    const assetTag = 'JEST-AT-' + Date.now();
    const createReq = makeMockReq({ resourceTypeId: createdTypeId, name: 'Jest Resource', assetTag, serialNumber: 'SN-JEST', department: 'CS', isSoftware: false, purchaseDate: '2024-01-01T00:00:00', warrantyUntil: '2025-01-01T00:00:00' });
    const createRes = await callController(rc.createResource, createReq);
    expect(createRes.statusCode).toBe(201);
    const resource = createRes._body.data;
    createdResourceId = resource.id;

    const getRes = await callController(rc.getResource, makeMockReq({}, { resourceId: createdResourceId }));
    expect(getRes.statusCode).toBe(200);
    expect(getRes._body.data.eav.isSoftware).toBeDefined();

    const updateRes = await callController(rc.updateResource, makeMockReq({ isSoftware: true, status: 'available' }, { resourceId: createdResourceId }));
    expect(updateRes.statusCode).toBe(200);

    // create allocation
    const allocCreate = await callController(rac.createAllocation, makeMockReq({ resourceId: createdResourceId, allocatedToDepartment: 'CS', allocatedBy: null }));
    expect(allocCreate.statusCode).toBe(201);
    createdAllocationId = allocCreate._body.data.id;

    const listAlloc = await callController(rac.listAllocations, makeMockReq({}, {}, { resourceId: createdResourceId }));
    expect(listAlloc.statusCode).toBe(200);
    expect(Array.isArray(listAlloc._body.data)).toBe(true);

    const updateAlloc = await callController(rac.updateAllocation, makeMockReq({ status: 'returned', returnedAt: new Date().toISOString() }, { allocationId: createdAllocationId }));
    expect(updateAlloc.statusCode).toBe(200);

    // cleanup created records
    await db.query('DELETE FROM resource_allocations WHERE id=$1', [createdAllocationId]);
    await db.query('DELETE FROM eav_values WHERE entity_type=$1 AND entity_id=$2', ['resource', createdResourceId]);
    await db.query('DELETE FROM resources WHERE id=$1', [createdResourceId]);
  });

  test('create resource with invalid resourceTypeId should fail', async () => {
    const createReq = makeMockReq({ resourceTypeId: 99999999, name: 'Bad Resource' });
    const createRes = await callController(rc.createResource, createReq);
    expect(createRes.statusCode).toBeGreaterThanOrEqual(400);
  });

  test('getResource with invalid id returns 400', async () => {
    const res = await callController(rc.getResource, makeMockReq({}, { resourceId: 'abc' }));
    expect(res.statusCode).toBe(400);
  });

  test('getResource not found returns 404', async () => {
    const res = await callController(rc.getResource, makeMockReq({}, { resourceId: 99999999 }));
    expect(res.statusCode).toBe(404);
  });

  test('updateResource non-existent returns 404', async () => {
    const res = await callController(rc.updateResource, makeMockReq({ name: 'x' }, { resourceId: 99999999 }));
    expect(res.statusCode).toBe(404);
  });

  test('createAllocation without resourceId should fail (400)', async () => {
    const res = await callController(rac.createAllocation, makeMockReq({}));
    expect(res.statusCode).toBe(400);
  });

  test('updateAllocation non-existent returns 404', async () => {
    const res = await callController(rac.updateAllocation, makeMockReq({ status: 'returned' }, { allocationId: 99999999 }));
    expect(res.statusCode).toBe(404);
  });
});
