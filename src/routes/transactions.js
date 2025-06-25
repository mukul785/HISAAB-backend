import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import {
    getTransactions,
    createTransaction,
    getTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionTotals
} from '../controllers/transactionsController.js';

const router = express.Router();

router.use(authenticateJWT);

router.get('/', getTransactions);
router.post('/', createTransaction);
router.get('/totals', getTransactionTotals);
router.get('/:id', getTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router; 