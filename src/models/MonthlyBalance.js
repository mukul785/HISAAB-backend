import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

/**
 * MonthlyBalance Model
 * Stores monthly snapshots of account balances for historical tracking.
 * Used by the "mtur" (Monthly Track User Balance) AB feature.
 */
const MonthlyBalance = sequelize.define('MonthlyBalance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  account_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  month: {
    type: DataTypes.INTEGER, // 1-12
    allowNull: false,
    validate: {
      min: 1,
      max: 12,
    },
  },
  opening_balance: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
  },
  closing_balance: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
  },
  total_sales: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
  },
  total_expenses: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
  },
  transaction_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'monthly_balances',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'account_id', 'year', 'month'],
      name: 'unique_user_account_year_month',
    },
    {
      fields: ['user_id', 'year', 'month'],
      name: 'idx_user_year_month',
    },
  ],
});

export default MonthlyBalance;
