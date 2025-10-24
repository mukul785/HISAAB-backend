import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Token from '../models/Token.js';
import Account from '../models/Account.js';
import sequelize from '../db.js';
import { Op } from 'sequelize';
import Transaction from '../models/Transaction.js';
import Invoice from '../models/Invoice.js';
import InvoiceItem from '../models/InvoiceItem.js';

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
    const account = await Account.findOne({ where: { user_id: user.id, default: true } });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ user, access_token: token, token_type: 'bearer', account });
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

export const deleteUser = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const t = await sequelize.transaction();
    try {
      // Delete tokens
      await Token.destroy({ where: { user_id: userId }, transaction: t });

      // Collect account ids
      const accounts = await Account.findAll({ where: { user_id: userId }, transaction: t });
      const accountIds = accounts.map(a => a.id);

      // Delete transactions linked to user or their accounts
      const orClauses = [{ user_id: userId }];
      if (accountIds.length) {
        orClauses.push({ account_id: { [Op.in]: accountIds } });
      }
      await Transaction.destroy({ where: { [Op.or]: orClauses }, transaction: t });

      // Collect invoice ids, then delete invoice items and invoices
      const invoices = await Invoice.findAll({ where: { user_id: userId }, transaction: t });
      const invoiceIds = invoices.map(inv => inv.id);
      if (invoiceIds.length) {
        await InvoiceItem.destroy({ where: { invoice_id: { [Op.in]: invoiceIds } }, transaction: t });
      }
      await Invoice.destroy({ where: { user_id: userId }, transaction: t });

      // Delete accounts
      await Account.destroy({ where: { user_id: userId }, transaction: t });

      // Finally delete user
      await User.destroy({ where: { id: userId }, transaction: t });

      await t.commit();
      res.json({ message: 'User and related data deleted' });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
};