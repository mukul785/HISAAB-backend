import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import sequelize from '../db.js';
import { hasFeature, abResponse } from '../utils/abHelper.js';
import { 
    getMonthlyBalanceData, 
    getMonthlySummary,
    backfillUserMonthlyBalance 
} from '../utils/monthlyBalanceHelper.js';

export const createAccount = async (req, res, next) => {
    try {
        const { name, balance } = req.body;
        if (!name) return res.status(400).json({ message: 'Account name is required' });
        if (balance !== undefined && Number(balance) !== 0) {
            return res.status(400).json({ message: 'Initial balance must be zero; omit balance field' });
        }
        const account = await Account.create({
            name,
            balance: 0.0,
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
        const userId = req.user.id;

        const t = await sequelize.transaction();
        try {
            const accounts = await Account.findAll({ where: { user_id: userId }, transaction: t });
            if (!accounts || accounts.length === 0) {
                await t.rollback();
                return res.status(404).json({ message: 'No accounts found' });
            }
            if (accounts.length === 1) {
                await t.rollback();
                return res.status(400).json({ message: 'Cannot delete the last account. User must have at least one account.' });
            }

            const account = await Account.findOne({ where: { id: req.params.id, user_id: userId }, transaction: t });
            if (!account) {
                await t.rollback();
                return res.status(404).json({ message: 'Account not found' });
            }

            const wasDefault = !!account.default;
            await account.destroy({ transaction: t });

            if (wasDefault) {
                // Assign default to another remaining account
                const newDefault = await Account.findOne({ where: { user_id: userId }, transaction: t });
                if (newDefault) {
                    newDefault.default = true;
                    await newDefault.save({ transaction: t });
                }
            }

            await t.commit();
            res.status(204).send();
        } catch (err) {
            await t.rollback();
            throw err;
        }
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

        // Control response (AB=0): Simple balance
        const controlResponse = { total_balance: total };

        // Experiment response (AB=1): Balance with monthly breakdown
        let experimentResponse = { total_balance: total };
        if (await hasFeature(req, 'mtur')) {
            const monthlyData = await getMonthlySummary(req.user.id, { limit: 12 });
            experimentResponse.monthly_data = monthlyData;
        }

        const response = await abResponse(req, 'mtur', controlResponse, experimentResponse);
        res.json(response);
    } catch (err) {
        next(err);
    }
};

export const setDefaultAccount = async (req, res, next) => {
    try {
        const accountId = req.params.id;
        const account = await Account.findOne({ where: { id: accountId, user_id: req.user.id } });
        if (!account) return res.status(404).json({ message: 'Account not found' });
        await Account.update({ default: false }, { where: { user_id: req.user.id } });
        account.default = true;
        await account.save();
        res.json({ message: 'Default account updated', account });
    } catch (err) {
        next(err);
    }
};

/**
 * Get monthly balance data for user (AB: mtur)
 * Returns monthly breakdown of balances, sales, and expenses
 * 
 * Query params:
 * - account_id: Filter by specific account
 * - year: Filter by specific year
 * - limit: Number of months to return (default: 12)
 */
export const getMonthlyBalance = async (req, res, next) => {
    try {
        const { account_id, year, limit } = req.query;
        
        const options = {
            accountId: account_id,
            year: year ? parseInt(year) : null,
            limit: limit ? parseInt(limit) : 12,
        };

        const monthlyData = await getMonthlyBalanceData(req.user.id, options);
        
        res.json({
            monthly_balances: monthlyData,
            count: monthlyData.length,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get monthly summary across all accounts (AB: mtur)
 * Returns aggregated monthly totals
 */
export const getMonthlyBalanceSummary = async (req, res, next) => {
    try {
        const { year, limit } = req.query;
        
        const options = {
            year: year ? parseInt(year) : null,
            limit: limit ? parseInt(limit) : 12,
        };

        const summary = await getMonthlySummary(req.user.id, options);
        
        res.json({
            summary,
            count: summary.length,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Backfill monthly balance data from existing transactions (AB: mtur)
 * This is typically called once when a user first gets mtur=1
 */
export const backfillMonthlyBalance = async (req, res, next) => {
    try {
        const { account_id } = req.query;
        
        const result = await backfillUserMonthlyBalance(req.user.id, account_id || null);
        
        res.json({
            message: 'Monthly balance backfill completed',
            processed_months: result.processed,
            accounts_processed: result.created,
        });
    } catch (err) {
        next(err);
    }
};