const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (user) => {
  const payload = { id: user._id, email: user.email, role: user.role };
  const secret = process.env.JWT_SECRET || 'replace_me_with_strong_secret';
  const expiresIn = process.env.JWT_EXP || '7d';
  return jwt.sign(payload, secret, { expiresIn });
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password, phone, specialInfo, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    // Check existing
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      password: hashed,
      phone,
      specialInfo,
      role: role || 'student'
    });

    await user.save();

    // return token + user (without password)
    const token = generateToken(user);
    const returnedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      specialInfo: user.specialInfo,
      createdAt: user.createdAt
    };

    return res.status(201).json({ token, user: returnedUser });
  } catch (err) {
    console.error('Signup error', err);
    return res.status(500).json({ message: 'Server error during signup' });
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

    const token = generateToken(user);
    const returnedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      specialInfo: user.specialInfo,
      createdAt: user.createdAt
    };

    return res.json({ token, user: returnedUser });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ message: 'Server error during login' });
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
    specialInfo: user.specialInfo,
    createdAt: user.createdAt
  });
};
