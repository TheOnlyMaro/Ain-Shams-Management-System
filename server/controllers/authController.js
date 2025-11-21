const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const mongoose = require('mongoose');

// Access token generation (short-lived)
const generateAccessToken = (user) => {
  const payload = { id: user._id, email: user.email, role: user.role, staffType: user.staffType };
  const secret = process.env.JWT_SECRET || 'replace_me_with_strong_secret';
  const expiresIn = process.env.JWT_ACCESS_EXP || '15m';
  return jwt.sign(payload, secret, { expiresIn });
};

// Refresh tokens are opaque random strings stored in DB for rotation/revocation
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

exports.signup = async (req, res) => {
  try {
    // fail fast when DB is not connected to make client behavior deterministic
    const state = mongoose.connection.readyState; // 0 = disconnected, 1 = connected
    if (state !== 1) {
      console.error('Signup attempted while DB not connected. mongoose.readyState=', state);
      return res.status(503).json({ message: 'Database not connected', state });
    }
    const { name, email, password, phone, specialInfo, role, staffType } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    // create user using the model create helper to ensure a persisted document is returned
    const refreshToken = generateRefreshToken();
    const userPayload = {
      name,
      email,
      password: hashed,
      phone,
      specialInfo,
      role: role || 'student',
      refreshTokens: [{ token: refreshToken }],
    };

    // Only include staffType when provided to avoid saving `null` which may violate enum validation
    if (typeof staffType !== 'undefined' && staffType !== null && staffType !== '') {
      userPayload.staffType = staffType;
    }

    console.log('Signup: creating user with email=', email);
    const user = await User.create(userPayload);
    console.log('Signup: user created _id=', user && user._id);

    const accessToken = generateAccessToken(user);
    const returnedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      staffType: user.staffType,
      specialInfo: user.specialInfo,
      createdAt: user.createdAt
    };

    return res.status(201).json({ token: accessToken, refreshToken, user: returnedUser });
  } catch (err) {
    console.error('Signup error', err && (err.stack || err));
    const message = (err && err.message) ? err.message : 'Server error during signup';
    return res.status(500).json({ message: 'Server error during signup', error: message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    // rotate refresh token: issue a new one and persist
    const refreshToken = generateRefreshToken();
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push({ token: refreshToken });
    // keep only recent N tokens to avoid unbounded growth (optional)
    if (user.refreshTokens.length > 10) user.refreshTokens = user.refreshTokens.slice(-10);
    await user.save();

    const accessToken = generateAccessToken(user);
    const returnedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      staffType: user.staffType,
      specialInfo: user.specialInfo,
      createdAt: user.createdAt
    };

    return res.json({ token: accessToken, refreshToken, user: returnedUser });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

// Exchange a refresh token for a new access token (and rotate refresh token)
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

    const user = await User.findOne({ 'refreshTokens.token': refreshToken });
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' });

    // rotate: remove the used token and add a new one
    user.refreshTokens = (user.refreshTokens || []).filter(rt => rt.token !== refreshToken);
    const newRefreshToken = generateRefreshToken();
    user.refreshTokens.push({ token: newRefreshToken });
    if (user.refreshTokens.length > 10) user.refreshTokens = user.refreshTokens.slice(-10);
    await user.save();

    const accessToken = generateAccessToken(user);
    return res.json({ token: accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('Refresh error', err);
    return res.status(500).json({ message: 'Server error during token refresh' });
  }
};

// Revoke a refresh token (logout)
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });
    const user = await User.findOne({ 'refreshTokens.token': refreshToken });
    if (!user) return res.status(200).json({ message: 'Logged out' });
    user.refreshTokens = (user.refreshTokens || []).filter(rt => rt.token !== refreshToken);
    await user.save();
    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('Logout error', err);
    return res.status(500).json({ message: 'Server error during logout' });
  }
};

exports.me = async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    staffType: user.staffType,
    specialInfo: user.specialInfo,
    createdAt: user.createdAt
  });
};
