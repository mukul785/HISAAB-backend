import express from 'express';
import { register, login, logout, me, deleteUser, updateMe } from '../controllers/authController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticateJWT, logout);
router.get('/me', authenticateJWT, me);
router.patch('/me', authenticateJWT, updateMe);
router.delete('/me', authenticateJWT, deleteUser);

export default router;