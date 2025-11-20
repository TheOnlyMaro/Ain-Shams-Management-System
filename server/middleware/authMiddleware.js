const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
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
    next();
  } catch (err) {
    console.error('Auth middleware token error', err);
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};
