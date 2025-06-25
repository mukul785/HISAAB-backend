import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import {
  getInvoices,
  createInvoice,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  markInvoiceAsPaid,
  recalculateInvoiceTaxes
} from '../controllers/invoicesController.js';

const router = express.Router();

router.use(authenticateJWT);

router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);
router.post('/:id/mark-as-paid', markInvoiceAsPaid);
router.post('/:id/recalculate-taxes', recalculateInvoiceTaxes);

export default router; 