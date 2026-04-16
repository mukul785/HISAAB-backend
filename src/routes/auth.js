import express from 'express';
import { register, login, logout, me, deleteUser, updateMe, inspectToken } from '../controllers/authController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticateJWT, logout);
router.get('/me', authenticateJWT, me);
router.patch('/me', authenticateJWT, updateMe);
router.delete('/me', authenticateJWT, deleteUser);
router.get('/inspect-token', inspectToken); // Debug endpoint - remove in production

export default router;