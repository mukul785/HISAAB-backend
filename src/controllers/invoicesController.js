import Invoice from '../models/Invoice.js';
import InvoiceItem from '../models/InvoiceItem.js';
import Transaction from '../models/Transaction.js';
import { Op } from 'sequelize';

export const getInvoices = async (req, res, next) => {
    try {
        const where = { user_id: req.user.id };
        if (req.query.status) where.status = req.query.status;
        if (req.query.start_date) where.issue_date = { ...where.issue_date, [Op.gte]: new Date(req.query.start_date) };
        if (req.query.end_date) where.issue_date = { ...where.issue_date, [Op.lte]: new Date(req.query.end_date) };
        if (req.query.customer_name) where.customer_name = req.query.customer_name;
        const invoices = await Invoice.findAll({ where, include: [InvoiceItem] });
        res.json(invoices);
    } catch (err) {
        next(err);
    }
};

export const createInvoice = async (req, res, next) => {
    try {
        let { invoice_number, customer_name, customer_email, customer_address, issue_date, due_date, tax_rate, status, notes, template, items } = req.body;
        if (!customer_name) return res.status(400).json({ message: 'customer_name is required' });

        if (!invoice_number) {
            invoice_number = 'INV-' + Date.now();
        }

        const invoice = await Invoice.create({
            invoice_number,
            customer_name,
            customer_email,
            customer_address,
            issue_date: issue_date ? new Date(issue_date) : new Date(),
            due_date: due_date ? new Date(due_date) : null,
            tax_rate: tax_rate || 18.0,
            status: status || 'draft',
            notes,
            template: template || 'default',
            subtotal: 0,
            tax_amount: 0,
            total_amount: 0,
            user_id: req.user.id,
        });
        let subtotal = 0, tax_amount = 0, total_amount = 0;
        if (items && Array.isArray(items)) {
            for (const item of items) {
                const { description, quantity, unit_price, amount, tax_included } = item;
                const itemSubtotal = amount !== undefined ? amount : (quantity || 1) * unit_price;
                subtotal += itemSubtotal;
                let itemTax = 0;
                if (!tax_included) itemTax = (invoice.tax_rate / 100) * itemSubtotal;
                tax_amount += itemTax;
                total_amount += itemSubtotal + itemTax;
                await InvoiceItem.create({
                    description,
                    quantity: quantity || 1,
                    unit_price,
                    amount: itemSubtotal,
                    tax_included: tax_included !== undefined ? tax_included : true,
                    invoice_id: invoice.id,
                });
            }
        }
        invoice.subtotal = subtotal;
        invoice.tax_amount = tax_amount;
        invoice.total_amount = total_amount || subtotal + tax_amount;
        await invoice.save();
        res.status(201).json(invoice);
    } catch (err) {
        next(err);
    }
};

export const getInvoice = async (req, res, next) => {
    try {
        const invoice = await Invoice.findOne({ where: { id: req.params.id, user_id: req.user.id }, include: [InvoiceItem] });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        res.json(invoice);
    } catch (err) {
        next(err);
    }
};

export const updateInvoice = async (req, res, next) => {
    try {
        const invoice = await Invoice.findOne({ where: { id: req.params.id, user_id: req.user.id } });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        const { customer_name, customer_email, customer_address, issue_date, due_date, tax_rate, status, notes, template } = req.body;
        if (customer_name !== undefined) invoice.customer_name = customer_name;
        if (customer_email !== undefined) invoice.customer_email = customer_email;
        if (customer_address !== undefined) invoice.customer_address = customer_address;
        if (issue_date !== undefined) invoice.issue_date = new Date(issue_date);
        if (due_date !== undefined) invoice.due_date = new Date(due_date);
        if (tax_rate !== undefined) invoice.tax_rate = tax_rate;
        if (status !== undefined) invoice.status = status;
        if (notes !== undefined) invoice.notes = notes;
        if (template !== undefined) invoice.template = template;
        await invoice.save();
        res.json(invoice);
    } catch (err) {
        next(err);
    }
};

export const deleteInvoice = async (req, res, next) => {
    try {
        const invoice = await Invoice.findOne({ where: { id: req.params.id, user_id: req.user.id } });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        await invoice.destroy();
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const markInvoiceAsPaid = async (req, res, next) => {
    try {
        const invoice = await Invoice.findOne({ where: { id: req.params.id, user_id: req.user.id } });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        invoice.status = 'paid';
        await invoice.save();
        // Optionally create a transaction for this invoice
        await Transaction.create({
            amount: invoice.total_amount,
            description: `Invoice paid: ${invoice.invoice_number}`,
            transaction_type: 'sale',
            date: new Date(),
            user_id: req.user.id,
            account_id: null,
        });
        res.json(invoice);
    } catch (err) {
        next(err);
    }
};

export const recalculateInvoiceTaxes = async (req, res, next) => {
    try {
        const invoice = await Invoice.findOne({ where: { id: req.params.id, user_id: req.user.id }, include: [InvoiceItem] });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        const tax_rate = req.query.tax_rate !== undefined ? parseFloat(req.query.tax_rate) : invoice.tax_rate;
        let subtotal = 0, tax_amount = 0, total_amount = 0;
        for (const item of invoice.InvoiceItems) {
            subtotal += item.amount;
            let itemTax = 0;
            if (!item.tax_included) itemTax = (tax_rate / 100) * item.amount;
            tax_amount += itemTax;
            total_amount += item.amount + itemTax;
        }
        invoice.tax_rate = tax_rate;
        invoice.subtotal = subtotal;
        invoice.tax_amount = tax_amount;
        invoice.total_amount = total_amount || subtotal + tax_amount;
        await invoice.save();
        res.json(invoice);
    } catch (err) {
        next(err);
    }
}; 