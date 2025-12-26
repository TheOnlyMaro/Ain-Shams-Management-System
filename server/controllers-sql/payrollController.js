const db = require('../db/sql');

// List payroll runs
exports.listPayruns = async (req, res) => {
  try {
    const q = await db.query('SELECT * FROM payroll_runs ORDER BY period_start DESC');
    return res.json({ success: true, data: q.rows });
  } catch (err) {
    console.error('[payroll:list]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getPayrun = async (req, res) => {
  try {
    const id = Number(req.params.payrunId);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
    const q = await db.query('SELECT * FROM payroll_runs WHERE id=$1', [id]);
    if (!q.rowCount) return res.status(404).json({ message: 'Not found' });
    const run = q.rows[0];
    const entries = await db.query('SELECT * FROM payroll_entries WHERE payroll_run_id=$1', [id]);
    run.entries = entries.rows;
    return res.json({ success: true, data: run });
  } catch (err) {
    console.error('[payroll:get]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Create a new payroll run
exports.createPayrun = async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.periodStart || !b.periodEnd) return res.status(400).json({ message: 'periodStart and periodEnd required' });
    const ins = await db.query(
      'INSERT INTO payroll_runs(period_start, period_end, notes) VALUES ($1,$2,$3) RETURNING *',
      [b.periodStart, b.periodEnd, b.notes || '']
    );
    return res.status(201).json({ success: true, data: ins.rows[0] });
  } catch (err) {
    console.error('[payroll:create]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Add an entry to a payrun
exports.addEntry = async (req, res) => {
  try {
    const runId = Number(req.params.payrunId);
    if (!Number.isInteger(runId)) return res.status(400).json({ message: 'Invalid payrun id' });
    const b = req.body || {};
    if (!b.userId) return res.status(400).json({ message: 'userId required' });
    const ins = await db.query(
      'INSERT INTO payroll_entries(payroll_run_id, user_id, gross_amount, net_amount, metadata) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [runId, b.userId, b.grossAmount || 0, b.netAmount || (b.grossAmount || 0), b.metadata || {}]
    );
    return res.status(201).json({ success: true, data: ins.rows[0] });
  } catch (err) {
    console.error('[payroll:addEntry]', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Add a payroll component to an entry
exports.addComponent = async (req, res) => {
  try {
    const entryId = Number(req.params.entryId);
    if (!Number.isInteger(entryId)) return res.status(400).json({ message: 'Invalid entry id' });
    const b = req.body || {};
    if (!b.componentType || b.amount === undefined) return res.status(400).json({ message: 'componentType and amount required' });
    const ins = await db.query(
      'INSERT INTO payroll_components(payroll_entry_id, component_type, amount, taxable, metadata) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [entryId, b.componentType, b.amount, !!b.taxable, b.metadata || {}]
    );
    return res.status(201).json({ success: true, data: ins.rows[0] });
  } catch (err) {
    console.error('[payroll:addComponent]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Finalize a payrun: compute net amounts from components (if present) and set run status
exports.finalizePayrun = async (req, res) => {
  try {
    const runId = Number(req.params.payrunId);
    if (!Number.isInteger(runId)) return res.status(400).json({ message: 'Invalid payrun id' });

    // For each entry, compute net_amount = COALESCE(sum(component.amount), gross_amount)
    await db.query(
      `UPDATE payroll_entries pe SET net_amount = COALESCE((SELECT SUM(amount) FROM payroll_components pc WHERE pc.payroll_entry_id = pe.id), pe.gross_amount),
        status = 'pending'
       WHERE pe.payroll_run_id = $1`,
      [runId]
    );

    await db.query('UPDATE payroll_runs SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2', ['finalized', runId]);
    const runQ = await db.query('SELECT * FROM payroll_runs WHERE id=$1', [runId]);
    const entries = await db.query('SELECT * FROM payroll_entries WHERE payroll_run_id=$1', [runId]);
    const run = runQ.rows[0];
    run.entries = entries.rows;
    return res.json({ success: true, data: run });
  } catch (err) {
    console.error('[payroll:finalize]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = exports;
