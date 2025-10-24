import express from 'express';
import { register, login, logout, me, deleteUser } from '../controllers/authController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticateJWT, logout);
router.get('/me', authenticateJWT, me);
router.delete('/me', authenticateJWT, deleteUser);

export default router;