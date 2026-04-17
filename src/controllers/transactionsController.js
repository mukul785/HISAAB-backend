import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import { Op } from 'sequelize';
import { hasFeature, abResponse } from '../utils/abHelper.js';
import { 
    updateMonthlyBalanceOnCreate, 
    updateMonthlyBalanceOnDelete,
    getMonthlySummary 
} from '../utils/monthlyBalanceHelper.js';

export const getTransactions = async (req, res, next) => {
    try {
        const where = { user_id: req.user.id };
        if (req.query.start_date) {
            where.date = { ...where.date, [Op.gte]: new Date(req.query.start_date) };
        }
        if (req.query.end_date) {
            const endDate = new Date(req.query.end_date);
            endDate.setUTCHours(23, 59, 59, 999); // Include entire day
            where.date = { ...where.date, [Op.lte]: endDate };
        }
        if (req.query.transaction_type) where.transaction_type = req.query.transaction_type;
        if (req.query.category) where.category = req.query.category;
        if (req.query.account_id) where.account_id = req.query.account_id;
        const transactions = await Transaction.findAll({ 
            where,
            order: [['date', 'DESC']]
        });
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
        const transactionDate = date ? new Date(date) : new Date();
        const transaction = await Transaction.create({
            amount,
            description,
            transaction_type,
            category,
            date: transactionDate,
            user_id: req.user.id,
            account_id: account_id || null,
        });

        // Update monthly balance if mtur feature is enabled
        if (account_id && await hasFeature(req, 'mtur')) {
            await updateMonthlyBalanceOnCreate(
                req.user.id,
                account_id,
                transaction_type,
                amount,
                transactionDate
            );
        }

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

        // Update monthly balance if mtur feature is enabled (before deleting)
        if (transaction.account_id && await hasFeature(req, 'mtur')) {
            await updateMonthlyBalanceOnDelete(
                req.user.id,
                transaction.account_id,
                transaction.transaction_type,
                transaction.amount,
                transaction.date
            );
        }

        // Update account balance (reverse the transaction effect)
        if (transaction.account_id) {
            const account = await Account.findOne({ where: { id: transaction.account_id, user_id: req.user.id } });
            if (account) {
                if (transaction.transaction_type === 'sale') account.balance -= transaction.amount;
                else if (transaction.transaction_type === 'expense') account.balance += transaction.amount;
                await account.save();
            }
        }

        await transaction.destroy();
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getTransactionTotals = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const accountId = req.query.account_id;
        
        // Build where clause
        const where = { user_id: userId };
        if (accountId) {
            // Verify account belongs to user
            const account = await Account.findOne({ where: { id: accountId, user_id: userId } });
            if (!account) {
                return res.status(404).json({ message: 'Account not found' });
            }
            where.account_id = accountId;
        }
        
        const transactions = await Transaction.findAll({ where });
        let total_sales = 0, total_expenses = 0;
        for (const t of transactions) {
            if (t.transaction_type === 'sale') total_sales += t.amount;
            else if (t.transaction_type === 'expense') total_expenses += t.amount;
        }
        
        // Get balance
        let balance = 0;
        if (accountId) {
            const account = await Account.findOne({ where: { id: accountId, user_id: userId } });
            balance = account ? account.balance : 0;
        } else {
            // Sum all account balances for user
            const accounts = await Account.findAll({ where: { user_id: userId } });
            balance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
        }

        // Control response (AB=0)
        const controlResponse = { total_sales, total_expenses, balance };

        // Experiment response (AB=1) - includes monthly breakdown
        let experimentResponse = { total_sales, total_expenses, balance };
        if (await hasFeature(req, 'mtur')) {
            const monthlyData = await getMonthlySummary(userId, { limit: 12 });
            experimentResponse.monthly_breakdown = monthlyData;
        }

        const response = await abResponse(req, 'mtur', controlResponse, experimentResponse);
        res.json(response);
    } catch (err) {
        next(err);
    }
}; 
