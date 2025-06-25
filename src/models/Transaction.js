import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  transaction_type: {
    type: DataTypes.ENUM('sale', 'expense', 'transfer', 'other'),
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  account_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'transactions',
  timestamps: false,
});

export default Transaction; 