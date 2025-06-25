import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import {
  calculateGst,
  calculateGstForInvoice,
  getTaxFiling,
  autoGenerateTaxFiling,
  submitTaxFiling,
  getTaxReport
} from '../controllers/taxController.js';

const router = express.Router();

router.use(authenticateJWT);

router.get('/gst', calculateGst);
router.get('/calculate-for-invoice/:invoice_id', calculateGstForInvoice);
router.get('/filing', getTaxFiling);
router.get('/filing/auto-generate', autoGenerateTaxFiling);
router.post('/submit', submitTaxFiling);
router.get('/report', getTaxReport);

export default router; 