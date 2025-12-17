const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/sql');

const generateAccessToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'replace_me_with_strong_secret';
  const expiresIn = process.env.JWT_ACCESS_EXP || '15m';
  return jwt.sign(payload, secret, { expiresIn });
};

const generateRefreshToken = () => crypto.randomBytes(64).toString('hex');

async function getRoleIdByName(roleName) {
  const r = await db.query('SELECT id FROM roles WHERE name = $1', [roleName]);
  if (r.rowCount) return r.rows[0].id;
  // fallback to student
  const s = await db.query("SELECT id FROM roles WHERE name = 'student'");
  return s.rows[0].id;
}

async function getAttributeId(entityType, attributeName) {
  const r = await db.query(
    'SELECT id FROM eav_attributes WHERE entity_type=$1 AND attribute_name=$2',
    [entityType, attributeName]
  );
  return r.rowCount ? r.rows[0].id : null;
}

exports.signup = async (req, res) => {
  try {
    const { name, email, password, phone, role, staffType } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    const exists = await db.query('SELECT 1 FROM users WHERE email=$1', [email]);
    if (exists.rowCount) return res.status(409).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const roleId = await getRoleIdByName(role || 'student');

    const ins = await db.query(
      `INSERT INTO users(name, email, password, phone, role_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, name, email, phone, role_id, created_at`,
      [name, email, hashed, phone || '', roleId]
    );
    const user = ins.rows[0];

    if (staffType) {
      const attrId = await getAttributeId('user', 'staffType');
      if (attrId) {
        await db.query(
          `INSERT INTO eav_values(entity_type, entity_id, attribute_id, string_value)
           VALUES ('user',$1,$2,$3)
           ON CONFLICT (entity_type, entity_id, attribute_id)
           DO UPDATE SET string_value=EXCLUDED.string_value, updated_at=CURRENT_TIMESTAMP`,
          [user.id, attrId, staffType]
        );
      }
    }

    const rt = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
    await db.query(
      `INSERT INTO refresh_tokens(user_id, token, created_at, expires_at)
       VALUES ($1,$2, CURRENT_TIMESTAMP, $3)`,
      [user.id, rt, expiresAt]
    );

    const roleRow = await db.query('SELECT name FROM roles WHERE id=$1', [user.role_id]);
    const staffRow = await db.query(
      `SELECT v.string_value FROM eav_values v
       JOIN eav_attributes a ON a.id = v.attribute_id
       WHERE v.entity_type='user' AND v.entity_id=$1 AND a.attribute_name='staffType'`,
      [user.id]
    );

    const payload = { id: user.id, email: user.email, role: roleRow.rows[0].name, staffType: staffRow.rows[0]?.string_value };
    const accessToken = generateAccessToken(payload);

    return res.status(201).json({
      token: accessToken,
      refreshToken: rt,
      user: {
        _id: String(user.id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: roleRow.rows[0].name,
        staffType: staffRow.rows[0]?.string_value || null,
        specialInfo: '',
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error('[auth:signup]', err);
    return res.status(500).json({ message: 'Server error during signup' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'email and password required' });

    const q = await db.query('SELECT id, name, email, password, phone, role_id, created_at FROM users WHERE email=$1', [email]);
    if (!q.rowCount) return res.status(401).json({ message: 'Invalid credentials' });
    const user = q.rows[0];

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const rt = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await db.query(
      `INSERT INTO refresh_tokens(user_id, token, created_at, expires_at)
       VALUES ($1,$2, CURRENT_TIMESTAMP, $3)`,
      [user.id, rt, expiresAt]
    );

    const roleRow = await db.query('SELECT name FROM roles WHERE id=$1', [user.role_id]);
    const staffRow = await db.query(
      `SELECT v.string_value FROM eav_values v
       JOIN eav_attributes a ON a.id = v.attribute_id
       WHERE v.entity_type='user' AND v.entity_id=$1 AND a.attribute_name='staffType'`,
      [user.id]
    );

    const payload = { id: user.id, email: user.email, role: roleRow.rows[0].name, staffType: staffRow.rows[0]?.string_value };
    const accessToken = generateAccessToken(payload);

    return res.json({
      token: accessToken,
      refreshToken: rt,
      user: {
        _id: String(user.id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: roleRow.rows[0].name,
        staffType: staffRow.rows[0]?.string_value || null,
        specialInfo: '',
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error('[auth:login]', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

    const r = await db.query('SELECT user_id FROM refresh_tokens WHERE token=$1', [refreshToken]);
    if (!r.rowCount) return res.status(401).json({ message: 'Invalid refresh token' });

    const userId = r.rows[0].user_id;
    // revoke the old token
    await db.query('DELETE FROM refresh_tokens WHERE token=$1', [refreshToken]);

    const userQ = await db.query('SELECT id, email, role_id FROM users WHERE id=$1', [userId]);
    const roleRow = await db.query('SELECT name FROM roles WHERE id=$1', [userQ.rows[0].role_id]);
    const staffRow = await db.query(
      `SELECT v.string_value FROM eav_values v
       JOIN eav_attributes a ON a.id = v.attribute_id
       WHERE v.entity_type='user' AND v.entity_id=$1 AND a.attribute_name='staffType'`,
      [userId]
    );

    const newRT = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await db.query(
      `INSERT INTO refresh_tokens(user_id, token, created_at, expires_at)
       VALUES ($1,$2, CURRENT_TIMESTAMP, $3)`,
      [userId, newRT, expiresAt]
    );

    const payload = { id: userId, email: userQ.rows[0].email, role: roleRow.rows[0].name, staffType: staffRow.rows[0]?.string_value };
    const accessToken = generateAccessToken(payload);
    return res.json({ token: accessToken, refreshToken: newRT });
  } catch (err) {
    console.error('[auth:refresh]', err);
    return res.status(500).json({ message: 'Server error during token refresh' });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });
    await db.query('DELETE FROM refresh_tokens WHERE token=$1', [refreshToken]);
    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('[auth:logout]', err);
    return res.status(500).json({ message: 'Server error during logout' });
  }
};

exports.me = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const r = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role_id, u.created_at, r.name as role_name
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id=$1`,
      [req.user.id]
    );
    if (!r.rowCount) return res.status(404).json({ message: 'User not found' });
    const staffRow = await db.query(
      `SELECT v.string_value FROM eav_values v
       JOIN eav_attributes a ON a.id = v.attribute_id
       WHERE v.entity_type='user' AND v.entity_id=$1 AND a.attribute_name='staffType'`,
      [req.user.id]
    );
    const row = r.rows[0];
    return res.json({
      _id: String(row.id),
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role_name,
      staffType: staffRow.rows[0]?.string_value || null,
      specialInfo: '',
      createdAt: row.created_at,
    });
  } catch (err) {
    console.error('[auth:me]', err);
    return res.status(500).json({ message: 'Server error during profile fetch' });
  }
};
