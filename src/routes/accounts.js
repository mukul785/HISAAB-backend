import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import {
  getAccounts,
  getAccount,
  updateAccount,
  deleteAccount,
  getAccountTransactions,
  getBalance,
  createAccount,
  setDefaultAccount
} from '../controllers/accountsController.js';

const router = express.Router();

router.use(authenticateJWT);

router.post('/', createAccount);
router.get('/', getAccounts);
router.get('/balance', getBalance);
router.get('/:id', getAccount);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);
router.get('/:id/transactions', getAccountTransactions);
router.patch('/:id/set-default', setDefaultAccount);

export default router;