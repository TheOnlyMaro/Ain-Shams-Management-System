const jwt = require('jsonwebtoken');

// Authenticate: verifies access (JWT) token and attaches `req.user` and `req.staffId`.
exports.authenticate = (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) return res.status(401).json({ message: 'Not authorized, token missing' });

  try {
    const secret = process.env.JWT_SECRET || 'replace_me_with_strong_secret';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    // convenience: set staffId for legacy code that expects it
    req.staffId = decoded.id || decoded._id || decoded.email;
    next();
  } catch (err) {
    console.error('Auth middleware token error', err);
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

// authorizeRole: factory that returns middleware to check user role or staffType
exports.authorizeRole = (required) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  const role = req.user.role;
  // allow if user has the role (e.g., 'admin' or 'staff')
  if (Array.isArray(required)) {
    if (required.includes(role)) return next();
  } else {
    if (role === required) return next();
  }

  // special-case: allow admissions staff via staffType in token payload
  if (req.user.staffType && (required === 'admissions' || (Array.isArray(required) && required.includes('admissions')))) {
    if (req.user.staffType === 'admissions') return next();
  }

  return res.status(403).json({ message: 'Forbidden: insufficient role' });
};

// optionalAuthenticate: if a valid token is present it attaches req.user, otherwise continues silently
exports.optionalAuthenticate = (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];
  else if (req.cookies && req.cookies.token) token = req.cookies.token;

  if (!token) {
    req.isAuthenticated = false;
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET || 'replace_me_with_strong_secret';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    req.isAuthenticated = true;
    return next();
  } catch (err) {
    // invalid token -> treat as unauthenticated but continue
    req.isAuthenticated = false;
    return next();
  }
};

// rejectIfAuthenticated: disallow requests from valid authenticated users (used for public application submission)
exports.rejectIfAuthenticated = (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];
  else if (req.cookies && req.cookies.token) token = req.cookies.token;

  if (!token) return next();

  try {
    const secret = process.env.JWT_SECRET || 'replace_me_with_strong_secret';
    const decoded = jwt.verify(token, secret);
    // valid token -> reject
    return res.status(403).json({ message: 'Logged-in users cannot submit applications. Please log out to apply.' });
  } catch (err) {
    // invalid token -> allow
    return next();
  }
};
