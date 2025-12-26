const path = require('path');
jest.setTimeout(30000);
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
let db;
let perf;

function makeMockReq(body = {}, params = {}, query = {}) { return { body, params, query, headers: {} }; }
function makeMockRes() { const res = {}; res.statusCode = 200; res.status = function(c){this.statusCode=c;return this}; res.json = function(obj){this._body=obj;return this}; return res; }
async function callController(fn, req) { const res = makeMockRes(); await fn(req, res); return res; }

describe('Performance controllers (integration)', () => {
  let createdReviewId;
  beforeAll(async () => {
    process.env.TEST_SCHEMA = 'test';
    const { execSync } = require('child_process');
    execSync('node server/scripts/apply-schema-test.js', { stdio: 'inherit' });
    db = require('../db/sql');
    perf = require('../controllers-sql/performanceController');
    await db.query('SELECT 1');
  });
  afterAll(async () => { if (db.pool && typeof db.pool.end === 'function') await db.pool.end(); });

  test('create review, add goal, add feedback, get review', async () => {
    const start = new Date().toISOString().slice(0,10);
    const end = start;
    const createRes = await callController(perf.createReview, makeMockReq({ userId: 1, periodStart: start, periodEnd: end }));
    expect(createRes.statusCode).toBe(201);
    createdReviewId = createRes._body.data.id;

    const goalRes = await callController(perf.addGoal, makeMockReq({ title: 'Improve X', description: 'Do more X' }, { reviewId: createdReviewId }));
    expect(goalRes.statusCode).toBe(201);

    const feedbackRes = await callController(perf.addFeedback, makeMockReq({ commenterId: 1, comment: 'Good work', rating: 4.5 }, { reviewId: createdReviewId }));
    expect(feedbackRes.statusCode).toBe(201);

    const getRes = await callController(perf.getReview, makeMockReq({}, { reviewId: createdReviewId }));
    expect(getRes.statusCode).toBe(200);
    expect(getRes._body.data.goals.length).toBeGreaterThan(0);
    expect(getRes._body.data.feedback.length).toBeGreaterThan(0);

    // cleanup
    await db.query('DELETE FROM performance_reviews WHERE id=$1', [createdReviewId]);
  });
});
