import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  invoice_number: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customer_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customer_email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: { isEmail: true },
  },
  customer_address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  issue_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  subtotal: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  tax_rate: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 18.0,
  },
  tax_amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  total_amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'paid', 'cancelled', 'overdue'),
    allowNull: false,
    defaultValue: 'draft',
  },
  notes: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  template: {
    type: DataTypes.ENUM('default', 'professional', 'simple', 'detailed'),
    allowNull: false,
    defaultValue: 'default',
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'invoices',
  timestamps: false,
});

export default Invoice; 