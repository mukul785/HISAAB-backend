import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import { requireFeature } from '../utils/abHelper.js';
import {
  getAccounts,
  getAccount,
  updateAccount,
  deleteAccount,
  getAccountTransactions,
  getBalance,
  createAccount,
  setDefaultAccount,
  getMonthlyBalance,
  getMonthlyBalanceSummary,
  backfillMonthlyBalance
} from '../controllers/accountsController.js';

const router = express.Router();

router.use(authenticateJWT);

router.post('/', createAccount);
router.get('/', getAccounts);
router.get('/balance', getBalance);

// Monthly balance endpoints (AB: mtur)
router.get('/monthly-balance', requireFeature('mtur'), getMonthlyBalance);
router.get('/monthly-balance/summary', requireFeature('mtur'), getMonthlyBalanceSummary);
router.post('/monthly-balance/backfill', requireFeature('mtur'), backfillMonthlyBalance);

router.get('/:id', getAccount);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);
router.get('/:id/transactions', getAccountTransactions);
router.patch('/:id/set-default', setDefaultAccount);

export default router;