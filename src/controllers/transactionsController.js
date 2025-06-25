import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import { Op } from 'sequelize';

export const getTransactions = async (req, res, next) => {
    try {
        const where = { user_id: req.user.id };
        if (req.query.start_date) where.date = { ...where.date, [Op.gte]: new Date(req.query.start_date) };
        if (req.query.end_date) where.date = { ...where.date, [Op.lte]: new Date(req.query.end_date) };
        if (req.query.transaction_type) where.transaction_type = req.query.transaction_type;
        if (req.query.category) where.category = req.query.category;
        if (req.query.account_id) where.account_id = req.query.account_id;
        const transactions = await Transaction.findAll({ where });
        res.json(transactions);
    } catch (err) {
        next(err);
    }
};

export const createTransaction = async (req, res, next) => {
    try {
        const { amount, description, transaction_type, category, date, account_id } = req.body;
        if (!amount || !description || !transaction_type) {
            return res.status(400).json({ message: 'amount, description, and transaction_type are required' });
        }
        // Update account balance
        let account = null;
        if (account_id) {
            account = await Account.findOne({ where: { id: account_id, user_id: req.user.id } });
            if (!account) return res.status(404).json({ message: 'Account not found' });
            if (transaction_type === 'sale') account.balance += amount;
            else if (transaction_type === 'expense') account.balance -= amount;
            await account.save();
        }
        const transaction = await Transaction.create({
            amount,
            description,
            transaction_type,
            category,
            date: date ? new Date(date) : new Date(),
            user_id: req.user.id,
            account_id: account_id || null,
        });
        res.status(201).json(transaction);
    } catch (err) {
        next(err);
    }
};

export const getTransaction = async (req, res, next) => {
    try {
        const transaction = await Transaction.findOne({ where: { id: req.params.id, user_id: req.user.id } });
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        res.json(transaction);
    } catch (err) {
        next(err);
    }
};

export const updateTransaction = async (req, res, next) => {
    try {
        const transaction = await Transaction.findOne({ where: { id: req.params.id, user_id: req.user.id } });
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        const { amount, description, transaction_type, category, date, account_id } = req.body;
        // If account or amount/type changes, update balances accordingly (not implemented here for brevity)
        if (amount !== undefined) transaction.amount = amount;
        if (description !== undefined) transaction.description = description;
        if (transaction_type !== undefined) transaction.transaction_type = transaction_type;
        if (category !== undefined) transaction.category = category;
        if (date !== undefined) transaction.date = new Date(date);
        if (account_id !== undefined) transaction.account_id = account_id;
        await transaction.save();
        res.json(transaction);
    } catch (err) {
        next(err);
    }
};

export const deleteTransaction = async (req, res, next) => {
    try {
        const transaction = await Transaction.findOne({ where: { id: req.params.id, user_id: req.user.id } });
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        // Optionally update account balance here
        await transaction.destroy();
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getTransactionTotals = async (req, res, next) => {
    try {
        const transactions = await Transaction.findAll({ where: { user_id: req.user.id } });
        let total_sales = 0, total_expenses = 0;
        for (const t of transactions) {
            if (t.transaction_type === 'sale') total_sales += t.amount;
            else if (t.transaction_type === 'expense') total_expenses += t.amount;
        }
        res.json({ total_sales, total_expenses });
    } catch (err) {
        next(err);
    }
}; 