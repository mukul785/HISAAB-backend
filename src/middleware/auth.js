import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Token from '../models/Token.js'; // <-- Correct import

export const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const blacklisted = await Token.findOne({ where: { token, revoked: true } });
    if (blacklisted) {
      return res.status(401).json({ message: 'Token has been revoked (logged out)' });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};