const db = require('../db/sql');

// List reviews (optionally by user)
exports.listReviews = async (req, res) => {
  try {
    const { userId } = req.query || {};
    if (userId) {
      const q = await db.query('SELECT * FROM performance_reviews WHERE user_id=$1 ORDER BY period_start DESC', [userId]);
      return res.json({ success: true, data: q.rows });
    }
    const q = await db.query('SELECT * FROM performance_reviews ORDER BY period_start DESC');
    return res.json({ success: true, data: q.rows });
  } catch (err) {
    console.error('[performance:list]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getReview = async (req, res) => {
  try {
    const id = Number(req.params.reviewId);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
    const q = await db.query('SELECT * FROM performance_reviews WHERE id=$1', [id]);
    if (!q.rowCount) return res.status(404).json({ message: 'Not found' });
    const review = q.rows[0];
    const goals = await db.query('SELECT * FROM performance_goals WHERE review_id=$1', [id]);
    const feedback = await db.query('SELECT pf.*, u.name as commenter_name FROM performance_feedback pf LEFT JOIN users u ON u.id=pf.commenter_id WHERE pf.review_id=$1 ORDER BY pf.created_at', [id]);
    review.goals = goals.rows;
    review.feedback = feedback.rows;
    return res.json({ success: true, data: review });
  } catch (err) {
    console.error('[performance:get]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Create a review (admin/staff)
exports.createReview = async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.userId || !b.periodStart || !b.periodEnd) return res.status(400).json({ message: 'userId, periodStart, periodEnd required' });
    const ins = await db.query(
      'INSERT INTO performance_reviews(user_id, reviewer_id, period_start, period_end, summary, metadata) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [b.userId, b.reviewerId || null, b.periodStart, b.periodEnd, b.summary || '', b.metadata || {}]
    );
    return res.status(201).json({ success: true, data: ins.rows[0] });
  } catch (err) {
    console.error('[performance:create]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Add a goal to a review
exports.addGoal = async (req, res) => {
  try {
    const reviewId = Number(req.params.reviewId);
    if (!Number.isInteger(reviewId)) return res.status(400).json({ message: 'Invalid review id' });
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ message: 'title required' });
    const ins = await db.query('INSERT INTO performance_goals(review_id, title, description, target_date) VALUES ($1,$2,$3,$4) RETURNING *', [reviewId, b.title, b.description || '', b.targetDate || null]);
    return res.status(201).json({ success: true, data: ins.rows[0] });
  } catch (err) {
    console.error('[performance:addGoal]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Add feedback/comment
exports.addFeedback = async (req, res) => {
  try {
    const reviewId = Number(req.params.reviewId);
    if (!Number.isInteger(reviewId)) return res.status(400).json({ message: 'Invalid review id' });
    const b = req.body || {};
    if (!b.commenterId || !b.comment) return res.status(400).json({ message: 'commenterId and comment required' });
    const ins = await db.query('INSERT INTO performance_feedback(review_id, commenter_id, comment, rating) VALUES ($1,$2,$3,$4) RETURNING *', [reviewId, b.commenterId, b.comment, b.rating || null]);
    return res.status(201).json({ success: true, data: ins.rows[0] });
  } catch (err) {
    console.error('[performance:addFeedback]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update review status/summary
exports.updateReview = async (req, res) => {
  try {
    const id = Number(req.params.reviewId);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
    const b = req.body || {};
    const fields = [];
    const vals = [];
    let idx = 1;
    if (b.reviewerId !== undefined) { fields.push(`reviewer_id=$${idx++}`); vals.push(b.reviewerId); }
    if (b.overallRating !== undefined) { fields.push(`overall_rating=$${idx++}`); vals.push(b.overallRating); }
    if (b.status !== undefined) { fields.push(`status=$${idx++}`); vals.push(b.status); }
    if (b.summary !== undefined) { fields.push(`summary=$${idx++}`); vals.push(b.summary); }
    if (fields.length) {
      vals.push(id);
      await db.query(`UPDATE performance_reviews SET ${fields.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=$${idx}`, vals);
    }
    const q = await db.query('SELECT * FROM performance_reviews WHERE id=$1', [id]);
    if (!q.rowCount) return res.status(404).json({ message: 'Not found' });
    return res.json({ success: true, data: q.rows[0] });
  } catch (err) {
    console.error('[performance:update]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = exports;
