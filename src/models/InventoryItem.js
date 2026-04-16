import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const InventoryItem = sequelize.define('InventoryItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  stock_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  sell_price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  cost_price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  sku_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  auto_index: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  low_stock_threshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
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
  tableName: 'inventory_items',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'sku_id'],
      name: 'unique_user_sku',
    },
    {
      fields: ['user_id'],
      name: 'idx_inventory_user',
    },
    {
      fields: ['category_id'],
      name: 'idx_inventory_category',
    },
  ],
});

export default InventoryItem;
