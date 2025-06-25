import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const InvoiceItem = sequelize.define('InvoiceItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
  },
  unit_price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  tax_included: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  invoice_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'invoice_items',
  timestamps: false,
});

export default InvoiceItem; 