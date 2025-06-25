import Invoice from '../models/Invoice.js';
import Transaction from '../models/Transaction.js';
import { Op } from 'sequelize';

export const calculateGst = async (req, res, next) => {
    try {
        const { amount, tax_included = false, tax_rate = 18 } = req.query;
        if (!amount) return res.status(400).json({ message: 'amount is required' });
        const amt = parseFloat(amount);
        const rate = parseFloat(tax_rate);
        let tax_amount, total_amount, original_amount;
        if (tax_included === 'true' || tax_included === true) {
            original_amount = amt / (1 + rate / 100);
            tax_amount = amt - original_amount;
            total_amount = amt;
        } else {
            original_amount = amt;
            tax_amount = (rate / 100) * amt;
            total_amount = amt + tax_amount;
        }
        res.json({
            original_amount,
            tax_rate: rate,
            tax_amount,
            total_amount,
            tax_included: tax_included === 'true' || tax_included === true,
            breakdown: { cgst: tax_amount / 2, sgst: tax_amount / 2 }
        });
    } catch (err) {
        next(err);
    }
};

export const calculateGstForInvoice = async (req, res, next) => {
    try {
        const invoice = await Invoice.findOne({ where: { id: req.params.invoice_id, user_id: req.user.id } });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        const rate = invoice.tax_rate || 18;
        const amt = invoice.subtotal;
        const tax_amount = (rate / 100) * amt;
        const total_amount = amt + tax_amount;
        const tax_included = invoice.tax_included || false;
        res.json({
            original_amount: amt,
            tax_rate: rate,
            tax_amount,
            total_amount,
            tax_included: tax_included,
            breakdown: { cgst: tax_amount / 2, sgst: tax_amount / 2 }
        });
    } catch (err) {
        next(err);
    }
};

export const getTaxFiling = async (req, res, next) => {
    try {
        const { start_date, end_date, tax_type = 'gst', period = 'quarterly' } = req.query;
        if (!start_date || !end_date) return res.status(400).json({ message: 'start_date and end_date are required' });
        const transactions = await Transaction.findAll({
            where: {
                user_id: req.user.id,
                date: { [Op.gte]: new Date(start_date), [Op.lte]: new Date(end_date) }
            }
        });
        let total_sales = 0, total_tax_collected = 0, total_tax_paid = 0, transaction_count = 0;
        for (const t of transactions) {
            if (t.transaction_type === 'sale') {
                total_sales += t.amount;
                total_tax_collected += t.amount * 0.18; // Assume 18% for demo
            } else if (t.transaction_type === 'expense') {
                total_tax_paid += t.amount * 0.18;
            }
            transaction_count++;
        }
        const net_tax_liability = total_tax_collected - total_tax_paid;
        res.json({
            summary: {
                period_start: start_date,
                period_end: end_date,
                tax_type,
                total_sales,
                total_tax_collected,
                total_tax_paid,
                net_tax_liability,
                transaction_count,
                status: 'draft'
            },
            transactions
        });
    } catch (err) {
        next(err);
    }
};

export const autoGenerateTaxFiling = async (req, res, next) => {
    try {
        // For demo, just call getTaxFiling with last quarter
        const now = new Date();
        const quarterStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        const quarterEnd = now;
        req.query.start_date = quarterStart.toISOString().slice(0, 10);
        req.query.end_date = quarterEnd.toISOString().slice(0, 10);
        return getTaxFiling(req, res, next);
    } catch (err) {
        next(err);
    }
};

export const submitTaxFiling = async (req, res, next) => {
    try {
        const { period_start, period_end, tax_type, total_tax_liability, payment_reference, notes } = req.body;
        if (!period_start || !period_end || !tax_type || total_tax_liability === undefined) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        // Simulate submission
        res.json({
            id: 'fake-id',
            submission_date: new Date(),
            period_start,
            period_end,
            tax_type,
            total_tax_liability,
            payment_reference,
            confirmation_number: 'CONFIRM123',
            status: 'submitted'
        });
    } catch (err) {
        next(err);
    }
};

export const getTaxReport = async (req, res, next) => {
    try {
        const { year, tax_type } = req.query;
        if (!year) return res.status(400).json({ message: 'year is required' });
        // Simulate report
        res.json({
            year: parseInt(year),
            total_tax_paid: 10000,
            filings: []
        });
    } catch (err) {
        next(err);
    }
}; 