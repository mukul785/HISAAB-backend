/**
 * Backfill Monthly Balance Data
 * 
 * This script populates MonthlyBalance records from existing transaction history
 * for users who have the 'mtur' AB feature enabled.
 * 
 * Usage:
 *   node src/utils/backfillMonthlyBalance.js [--all] [--user-id=<uuid>]
 * 
 * Options:
 *   --all         Process all users with mtur=1
 *   --user-id     Process specific user
 * 
 * Example:
 *   node src/utils/backfillMonthlyBalance.js --all
 *   node src/utils/backfillMonthlyBalance.js --user-id=abc-123-def
 */

import sequelize from '../db.js';
import User from '../models/User.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import MonthlyBalance from '../models/MonthlyBalance.js';
import ABFeature from '../models/ABFeature.js';
import UserABConfig from '../models/UserABConfig.js';
import { recalculateMonthlyBalance } from './monthlyBalanceHelper.js';

// Import associations to set up relationships
import '../models/associations.js';

const FEATURE_KEY = 'mtur';

/**
 * Get all users who have mtur=1
 */
const getMturUsers = async () => {
  const feature = await ABFeature.findOne({ where: { feature_key: FEATURE_KEY } });
  if (!feature) {
    console.log(`Feature '${FEATURE_KEY}' not found.`);
    return [];
  }

  // Users explicitly assigned to experiment
  const userConfigs = await UserABConfig.findAll({
    where: { feature_id: feature.id, value: true },
    include: [{ model: User, as: 'user', attributes: ['id', 'email', 'name'] }],
  });

  const explicitUsers = userConfigs.map(uc => uc.user).filter(Boolean);

  // If feature has default_value=true or rollout_percentage=100,
  // we might want to include users without explicit config
  // For now, only process explicit mtur=1 users
  
  return explicitUsers;
};

/**
 * Backfill monthly balance for a single user
 */
const backfillUser = async (userId) => {
  console.log(`\n  Processing user: ${userId}`);
  
  const accounts = await Account.findAll({ where: { user_id: userId } });
  console.log(`    Found ${accounts.length} accounts`);

  let totalMonths = 0;

  for (const account of accounts) {
    // Get all transactions for this account
    const transactions = await Transaction.findAll({
      where: { user_id: userId, account_id: account.id },
      order: [['date', 'ASC']],
    });

    if (transactions.length === 0) {
      console.log(`    Account ${account.name}: No transactions, skipping`);
      continue;
    }

    const firstDate = new Date(transactions[0].date);
    const now = new Date();

    // Process each month from first transaction to now
    let currentDate = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 1);

    let monthCount = 0;
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      await recalculateMonthlyBalance(userId, account.id, year, month);
      monthCount++;

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    console.log(`    Account ${account.name}: Processed ${monthCount} months`);
    totalMonths += monthCount;
  }

  return totalMonths;
};

/**
 * Main backfill function
 */
const runBackfill = async () => {
  console.log('='.repeat(60));
  console.log('Monthly Balance Backfill Script');
  console.log('='.repeat(60));

  const args = process.argv.slice(2);
  const processAll = args.includes('--all');
  const userIdArg = args.find(a => a.startsWith('--user-id='));
  const specificUserId = userIdArg ? userIdArg.split('=')[1] : null;

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('\nDatabase connected.\n');

    // Sync MonthlyBalance table (create if not exists)
    await MonthlyBalance.sync();
    console.log('MonthlyBalance table ready.\n');

    let users = [];

    if (specificUserId) {
      const user = await User.findByPk(specificUserId);
      if (!user) {
        console.log(`User not found: ${specificUserId}`);
        process.exit(1);
      }
      users = [user];
      console.log(`Processing specific user: ${user.email || user.id}`);
    } else if (processAll) {
      users = await getMturUsers();
      console.log(`Found ${users.length} users with mtur=1`);
    } else {
      console.log('\nUsage:');
      console.log('  node src/utils/backfillMonthlyBalance.js --all');
      console.log('  node src/utils/backfillMonthlyBalance.js --user-id=<uuid>\n');
      process.exit(0);
    }

    if (users.length === 0) {
      console.log('No users to process.');
      process.exit(0);
    }

    console.log('\nStarting backfill...\n');

    let totalUsers = 0;
    let totalMonths = 0;

    for (const user of users) {
      const months = await backfillUser(user.id);
      totalMonths += months;
      totalUsers++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('Backfill Complete!');
    console.log(`  Users processed: ${totalUsers}`);
    console.log(`  Total months processed: ${totalMonths}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error during backfill:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBackfill();
}

export { runBackfill, backfillUser, getMturUsers };
