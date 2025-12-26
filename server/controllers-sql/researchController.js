// server/controllers-sql/researchController.js
const db = require('../db/sql');

/**
 * Get all research papers with optional filtering
 */
exports.getAllResearch = async (req, res) => {
    try {
        const { category, status, author_id, limit = 50, offset = 0 } = req.query;

        let query = `
      SELECT r.*, u.name as author_actual_name
      FROM research r
      LEFT JOIN users u ON r.author_id = u.id
      WHERE 1=1
    `;

        const params = [];
        let paramCount = 0;

        if (category) {
            params.push(category);
            query += ` AND r.category = $${++paramCount}`;
        }

        if (status) {
            params.push(status);
            query += ` AND r.status = $${++paramCount}`;
        } else {
            query += ` AND r.status = 'published'`;
        }

        if (author_id) {
            params.push(parseInt(author_id));
            query += ` AND r.author_id = $${++paramCount}`;
        }

        query += ` ORDER BY r.publication_date DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await db.query(query, params);

        // Get tags for each research paper
        const researchIds = result.rows.map(r => r.id);
        let tagsMap = {};
        if (researchIds.length > 0) {
            const tagsResult = await db.query(`
        SELECT rt.research_id, t.name
        FROM research_tags rt
        JOIN tags t ON rt.tag_id = t.id
        WHERE rt.research_id = ANY($1)
      `, [researchIds]);

            tagsResult.rows.forEach(row => {
                if (!tagsMap[row.research_id]) tagsMap[row.research_id] = [];
                tagsMap[row.research_id].push(row.name);
            });
        }

        const data = result.rows.map(r => ({
            ...r,
            tags: tagsMap[r.id] || []
        }));

        return res.json({
            success: true,
            data,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: result.rowCount
            }
        });
    } catch (err) {
        console.error('[research:list]', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Get a single research paper by ID
 */
exports.getResearchById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `SELECT r.*, u.name as author_actual_name
       FROM research r
       LEFT JOIN users u ON r.author_id = u.id
       WHERE r.id = $1`,
            [id]
        );

        if (!result.rowCount) {
            return res.status(404).json({ success: false, message: 'Research not found' });
        }

        const research = result.rows[0];

        // Get tags
        const tagsResult = await db.query(`
      SELECT t.name
      FROM research_tags rt
      JOIN tags t ON rt.tag_id = t.id
      WHERE rt.research_id = $1
    `, [id]);

        research.tags = tagsResult.rows.map(t => t.name);

        return res.json({ success: true, data: research });
    } catch (err) {
        console.error('[research:getOne]', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Publish new research
 */
exports.publishResearch = async (req, res) => {
    try {
        const {
            title,
            abstract,
            category = 'general',
            publication_date,
            status = 'published',
            file_url = '',
            metadata = {},
            tags = []
        } = req.body;

        const author_id = req.user?.id;
        const author_name = req.user?.name || 'Unknown';

        const result = await db.query(
            `INSERT INTO research (
        title, abstract, author_id, author_name,
        category, publication_date, status, file_url, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
            [
                title, abstract, author_id, author_name,
                category, publication_date || new Date(), status,
                file_url, JSON.stringify(metadata)
            ]
        );

        console.log('[research:create] Query result count:', result.rowCount);
        console.log('[research:create] New row ID:', result.rows[0]?.id);

        const newResearch = result.rows[0];

        // Handle tags
        if (tags && tags.length > 0) {
            for (const tagName of tags) {
                // Find or create tag
                let tagResult = await db.query('SELECT id FROM tags WHERE name = $1', [tagName]);
                let tagId;
                if (tagResult.rowCount === 0) {
                    tagResult = await db.query('INSERT INTO tags (name) VALUES ($1) RETURNING id', [tagName]);
                }
                tagId = tagResult.rows[0].id;

                // Link tag
                await db.query(
                    'INSERT INTO research_tags (research_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [newResearch.id, tagId]
                );
            }
        }

        return res.status(201).json({ success: true, data: newResearch });
    } catch (err) {
        console.error('[research:create]', err);
        res.status(500).json({ success: false, message: 'Failed to publish research' });
    }
};

/**
 * Update research details
 */
exports.updateResearch = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const allowedUpdates = ['title', 'abstract', 'category', 'status', 'file_url', 'metadata'];
        const fields = [];
        const values = [];
        let paramCount = 1;

        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                fields.push(`${key} = $${paramCount++}`);
                values.push(key === 'metadata' ? JSON.stringify(updates[key]) : updates[key]);
            }
        });

        if (fields.length === 0 && !updates.tags) {
            return res.status(400).json({ success: false, message: 'No valid fields to update' });
        }

        let updatedResearch;
        if (fields.length > 0) {
            values.push(id);
            const query = `UPDATE research SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;
            const result = await db.query(query, values);
            if (!result.rowCount) {
                return res.status(404).json({ success: false, message: 'Research not found' });
            }
            updatedResearch = result.rows[0];
        }

        // Update tags if provided
        if (updates.tags) {
            // Clear existing tags
            await db.query('DELETE FROM research_tags WHERE research_id = $1', [id]);

            for (const tagName of updates.tags) {
                let tagResult = await db.query('SELECT id FROM tags WHERE name = $1', [tagName]);
                let tagId;
                if (tagResult.rowCount === 0) {
                    tagResult = await db.query('INSERT INTO tags (name) VALUES ($1) RETURNING id', [tagName]);
                }
                tagId = tagResult.rows[0].id;

                await db.query(
                    'INSERT INTO research_tags (research_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [id, tagId]
                );
            }
        }

        if (!updatedResearch) {
            const result = await db.query('SELECT * FROM research WHERE id = $1', [id]);
            updatedResearch = result.rows[0];
        }

        return res.json({ success: true, data: updatedResearch });
    } catch (err) {
        console.error('[research:update]', err);
        res.status(500).json({ success: false, message: 'Failed to update research' });
    }
};

/**
 * Delete research
 */
exports.deleteResearch = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query('DELETE FROM research WHERE id = $1', [id]);

        if (!result.rowCount) {
            return res.status(404).json({ success: false, message: 'Research not found' });
        }

        return res.status(204).send();
    } catch (err) {
        console.error('[research:delete]', err);
        res.status(500).json({ success: false, message: 'Failed to delete research' });
    }
};
