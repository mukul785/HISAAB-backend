import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Token from '../models/Token.js';
import Account from '../models/Account.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password, account_name } = req.body;
    if (!name || !email || !password || !account_name) {
      return res.status(400).json({ message: 'Name, email, password, and account_name are required' });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    // Create account for user and set as default
    const account = await Account.create({
      name: account_name,
      user_id: user.id,
      balance: 0.0,
      default: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const userObj = user.toJSON();
    delete userObj.password;
    res.status(201).json({
      user: userObj,
      access_token: token,
      token_type: 'bearer',
      account,
    });
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
    // Fetch all accounts for the user
    const accounts = await Account.findAll({ where: { user_id: user.id }, order: [['default', 'DESC']] });
    const account_ids = accounts.map(acc => acc.id);
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ access_token: token, token_type: 'bearer', account_ids });
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