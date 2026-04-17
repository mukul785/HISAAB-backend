import MonthlyBalance from '../models/MonthlyBalance.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import { Op } from 'sequelize';

/**
 * Monthly Balance Helper Utilities
 * Used by the "mtur" (Monthly Track User Balance) AB feature.
 * 
 * These functions manage monthly balance snapshots that track:
 * - Opening/closing balance for each month
 * - Total sales and expenses per month
 * - Transaction count per month
 */

/**
 * Get the year and month from a date
 * @param {Date} date 
 * @returns {{ year: number, month: number }}
 */
export const getYearMonth = (date) => {
  const d = new Date(date);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1, // 1-12
  };
};

/**
 * Get or create a monthly balance record for a specific month
 * If the record doesn't exist, calculates opening balance from previous month
 * 
 * @param {string} userId 
 * @param {string} accountId 
 * @param {number} year 
 * @param {number} month 
 * @returns {Promise<MonthlyBalance>}
 */
export const getOrCreateMonthlyBalance = async (userId, accountId, year, month) => {
  // Try to find existing record
  let monthlyBalance = await MonthlyBalance.findOne({
    where: { user_id: userId, account_id: accountId, year, month },
  });

  if (monthlyBalance) {
    return monthlyBalance;
  }

  // Calculate opening balance from previous month's closing balance
  let openingBalance = 0;
  
  // Find the most recent previous monthly balance
  const previousBalance = await MonthlyBalance.findOne({
    where: {
      user_id: userId,
      account_id: accountId,
      [Op.or]: [
        { year: { [Op.lt]: year } },
        { year, month: { [Op.lt]: month } },
      ],
    },
    order: [['year', 'DESC'], ['month', 'DESC']],
  });

  if (previousBalance) {
    openingBalance = previousBalance.closing_balance;
  }

  // Create new record
  monthlyBalance = await MonthlyBalance.create({
    user_id: userId,
    account_id: accountId,
    year,
    month,
    opening_balance: openingBalance,
    closing_balance: openingBalance, // Will be updated when transactions are added
    total_sales: 0,
    total_expenses: 0,
    transaction_count: 0,
    created_at: new Date(),
    updated_at: new Date(),
  });

  return monthlyBalance;
};

/**
 * Update monthly balance when a new transaction is created
 * 
 * @param {string} userId 
 * @param {string} accountId 
 * @param {string} transactionType - 'sale', 'expense', 'transfer', 'other'
 * @param {number} amount 
 * @param {Date} date - Transaction date
 * @returns {Promise<MonthlyBalance>}
 */
export const updateMonthlyBalanceOnCreate = async (userId, accountId, transactionType, amount, date) => {
  if (!accountId) return null;

  const { year, month } = getYearMonth(date);
  const monthlyBalance = await getOrCreateMonthlyBalance(userId, accountId, year, month);

  // Update totals based on transaction type
  if (transactionType === 'sale') {
    monthlyBalance.total_sales += amount;
    monthlyBalance.closing_balance += amount;
  } else if (transactionType === 'expense') {
    monthlyBalance.total_expenses += amount;
    monthlyBalance.closing_balance -= amount;
  }
  // transfer and other types don't affect monthly balance

  monthlyBalance.transaction_count += 1;
  monthlyBalance.updated_at = new Date();
  await monthlyBalance.save();

  // Update subsequent months' opening balances
  await propagateBalanceToFutureMonths(userId, accountId, year, month, monthlyBalance.closing_balance);

  return monthlyBalance;
};

/**
 * Update monthly balance when a transaction is deleted
 * 
 * @param {string} userId 
 * @param {string} accountId 
 * @param {string} transactionType 
 * @param {number} amount 
 * @param {Date} date 
 * @returns {Promise<MonthlyBalance|null>}
 */
export const updateMonthlyBalanceOnDelete = async (userId, accountId, transactionType, amount, date) => {
  if (!accountId) return null;

  const { year, month } = getYearMonth(date);
  const monthlyBalance = await MonthlyBalance.findOne({
    where: { user_id: userId, account_id: accountId, year, month },
  });

  if (!monthlyBalance) return null;

  // Reverse the transaction effect
  if (transactionType === 'sale') {
    monthlyBalance.total_sales -= amount;
    monthlyBalance.closing_balance -= amount;
  } else if (transactionType === 'expense') {
    monthlyBalance.total_expenses -= amount;
    monthlyBalance.closing_balance += amount;
  }

  monthlyBalance.transaction_count = Math.max(0, monthlyBalance.transaction_count - 1);
  monthlyBalance.updated_at = new Date();
  await monthlyBalance.save();

  // Update subsequent months' opening balances
  await propagateBalanceToFutureMonths(userId, accountId, year, month, monthlyBalance.closing_balance);

  return monthlyBalance;
};

/**
 * Propagate closing balance to future months' opening balances
 * This ensures consistency when a transaction is added/deleted in a past month
 * 
 * @param {string} userId 
 * @param {string} accountId 
 * @param {number} year 
 * @param {number} month 
 * @param {number} newClosingBalance 
 */
const propagateBalanceToFutureMonths = async (userId, accountId, year, month, newClosingBalance) => {
  // Find all future monthly balances for this account
  const futureBalances = await MonthlyBalance.findAll({
    where: {
      user_id: userId,
      account_id: accountId,
      [Op.or]: [
        { year: { [Op.gt]: year } },
        { year, month: { [Op.gt]: month } },
      ],
    },
    order: [['year', 'ASC'], ['month', 'ASC']],
  });

  let previousClosing = newClosingBalance;
  for (const balance of futureBalances) {
    const balanceDiff = previousClosing - balance.opening_balance;
    balance.opening_balance = previousClosing;
    balance.closing_balance += balanceDiff;
    balance.updated_at = new Date();
    await balance.save();
    previousClosing = balance.closing_balance;
  }
};

/**
 * Recalculate monthly balance from transactions (used for corrections/backfill)
 * 
 * @param {string} userId 
 * @param {string} accountId 
 * @param {number} year 
 * @param {number} month 
 * @returns {Promise<MonthlyBalance>}
 */
export const recalculateMonthlyBalance = async (userId, accountId, year, month) => {
  // Get start and end dates for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month

  // Fetch all transactions for this month
  const transactions = await Transaction.findAll({
    where: {
      user_id: userId,
      account_id: accountId,
      date: {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      },
    },
  });

  // Calculate totals
  let totalSales = 0;
  let totalExpenses = 0;
  for (const t of transactions) {
    if (t.transaction_type === 'sale') totalSales += t.amount;
    else if (t.transaction_type === 'expense') totalExpenses += t.amount;
  }

  // Get or create the record
  const monthlyBalance = await getOrCreateMonthlyBalance(userId, accountId, year, month);
  
  // Update with calculated values
  monthlyBalance.total_sales = totalSales;
  monthlyBalance.total_expenses = totalExpenses;
  monthlyBalance.closing_balance = monthlyBalance.opening_balance + totalSales - totalExpenses;
  monthlyBalance.transaction_count = transactions.length;
  monthlyBalance.updated_at = new Date();
  await monthlyBalance.save();

  return monthlyBalance;
};

/**
 * Get monthly balance data for a user (all accounts or specific account)
 * 
 * @param {string} userId 
 * @param {Object} options - { accountId, year, limit }
 * @returns {Promise<Array>}
 */
export const getMonthlyBalanceData = async (userId, options = {}) => {
  const { accountId, year, limit = 12 } = options;

  const where = { user_id: userId };
  if (accountId) where.account_id = accountId;
  if (year) where.year = year;

  const monthlyBalances = await MonthlyBalance.findAll({
    where,
    order: [['year', 'DESC'], ['month', 'DESC']],
    limit,
    include: [
      {
        model: Account,
        as: 'account',
        attributes: ['id', 'name'],
      },
    ],
  });

  return monthlyBalances.map(mb => ({
    id: mb.id,
    account_id: mb.account_id,
    account_name: mb.account?.name || null,
    year: mb.year,
    month: mb.month,
    opening_balance: mb.opening_balance,
    closing_balance: mb.closing_balance,
    total_sales: mb.total_sales,
    total_expenses: mb.total_expenses,
    net_change: mb.total_sales - mb.total_expenses,
    transaction_count: mb.transaction_count,
  }));
};

/**
 * Get aggregated monthly summary across all accounts
 * 
 * @param {string} userId 
 * @param {Object} options - { year, limit }
 * @returns {Promise<Array>}
 */
export const getMonthlySummary = async (userId, options = {}) => {
  const { year, limit = 12 } = options;

  const where = { user_id: userId };
  if (year) where.year = year;

  const monthlyBalances = await MonthlyBalance.findAll({
    where,
    order: [['year', 'DESC'], ['month', 'DESC']],
  });

  // Aggregate by year-month
  const summaryMap = new Map();
  for (const mb of monthlyBalances) {
    const key = `${mb.year}-${mb.month}`;
    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        year: mb.year,
        month: mb.month,
        total_opening_balance: 0,
        total_closing_balance: 0,
        total_sales: 0,
        total_expenses: 0,
        transaction_count: 0,
        account_count: 0,
      });
    }
    const summary = summaryMap.get(key);
    summary.total_opening_balance += mb.opening_balance;
    summary.total_closing_balance += mb.closing_balance;
    summary.total_sales += mb.total_sales;
    summary.total_expenses += mb.total_expenses;
    summary.transaction_count += mb.transaction_count;
    summary.account_count += 1;
  }

  // Convert to array and sort
  const summaryArray = Array.from(summaryMap.values())
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    })
    .slice(0, limit)
    .map(s => ({
      ...s,
      net_change: s.total_sales - s.total_expenses,
    }));

  return summaryArray;
};

/**
 * Backfill monthly balance for a user from their transaction history
 * Called when user first gets mtur=1 or for data migration
 * 
 * @param {string} userId 
 * @param {string} accountId - Optional, if not provided backfills all accounts
 * @returns {Promise<{ processed: number, created: number }>}
 */
export const backfillUserMonthlyBalance = async (userId, accountId = null) => {
  // Get accounts to process
  const accountWhere = { user_id: userId };
  if (accountId) accountWhere.id = accountId;
  const accounts = await Account.findAll({ where: accountWhere });

  let totalProcessed = 0;
  let totalCreated = 0;

  for (const account of accounts) {
    // Get earliest and latest transaction dates for this account
    const transactions = await Transaction.findAll({
      where: { user_id: userId, account_id: account.id },
      order: [['date', 'ASC']],
    });

    if (transactions.length === 0) continue;

    const firstDate = new Date(transactions[0].date);
    const lastDate = new Date(transactions[transactions.length - 1].date);
    const now = new Date();

    // Process each month from first transaction to now
    let currentDate = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 1);

    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      await recalculateMonthlyBalance(userId, account.id, year, month);
      totalProcessed++;

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    totalCreated += transactions.length > 0 ? 1 : 0;
  }

  return { processed: totalProcessed, created: totalCreated };
};
