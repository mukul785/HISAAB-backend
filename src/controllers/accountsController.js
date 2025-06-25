import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';

export const createAccount = async (req, res, next) => {
    try {
        const { name, balance } = req.body;
        if (!name) return res.status(400).json({ message: 'Account name is required' });
        const account = await Account.create({
            name,
            balance: balance !== undefined ? balance : 0.0,
            user_id: req.user.id,
            created_at: new Date(),
            updated_at: new Date(),
        });
        res.status(201).json(account);
    } catch (err) {
        next(err);
    }
};

export const getAccounts = async (req, res, next) => {
    try {
        const accounts = await Account.findAll({ where: { user_id: req.user.id } });
        res.json(accounts);
    } catch (err) {
        next(err);
    }
};

export const getAccount = async (req, res, next) => {
    try {
        const account = await Account.findOne({ where: { id: req.params.id, user_id: req.user.id } });
        if (!account) return res.status(404).json({ message: 'Account not found' });
        res.json(account);
    } catch (err) {
        next(err);
    }
};

export const updateAccount = async (req, res, next) => {
    try {
        const account = await Account.findOne({ where: { id: req.params.id, user_id: req.user.id } });
        if (!account) return res.status(404).json({ message: 'Account not found' });
        const { name, balance } = req.body;
        if (name !== undefined) account.name = name;
        if (balance !== undefined) account.balance = balance;
        await account.save();
        res.json(account);
    } catch (err) {
        next(err);
    }
};

export const deleteAccount = async (req, res, next) => {
    try {
        const account = await Account.findOne({ where: { id: req.params.id, user_id: req.user.id } });
        if (!account) return res.status(404).json({ message: 'Account not found' });
        await account.destroy();
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getAccountTransactions = async (req, res, next) => {
    try {
        const account = await Account.findOne({ where: { id: req.params.id, user_id: req.user.id } });
        if (!account) return res.status(404).json({ message: 'Account not found' });
        const where = { account_id: req.params.id };
        if (req.query.start_date) where.date = { ...where.date, $gte: new Date(req.query.start_date) };
        if (req.query.end_date) where.date = { ...where.date, $lte: new Date(req.query.end_date) };
        if (req.query.transaction_type) where.transaction_type = req.query.transaction_type;
        const transactions = await Transaction.findAll({ where });
        res.json(transactions);
    } catch (err) {
        next(err);
    }
};

export const getBalance = async (req, res, next) => {
    try {
        const accounts = await Account.findAll({ where: { user_id: req.user.id } });
        const total = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
        res.json({ total_balance: total });
    } catch (err) {
        next(err);
    }
}; 