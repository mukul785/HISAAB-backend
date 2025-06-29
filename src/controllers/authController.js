import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Token from '../models/Token.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    const userObj = user.toJSON();
    delete userObj.password;
    res.status(201).json(userObj);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    const user = await User.findOne({ where: { email: username } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ access_token: token, token_type: 'bearer' });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const payload = jwt.decode(token);
    if (!payload || !payload.exp) {
      return res.status(400).json({ message: 'Invalid token' });
    }
    await Token.create({
      user_id: req.user.id,
      token,
      expires_at: new Date(payload.exp * 1000),
      revoked: true,
    });
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const userObj = req.user.toJSON();
    delete userObj.password;
    res.json(userObj);
  } catch (err) {
    next(err);
  }
}; 