import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const InventoryCategory = sequelize.define('InventoryCategory', {
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
    type: DataTypes.STRING,
    allowNull: true,
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
  tableName: 'inventory_categories',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'name'],
      name: 'unique_user_category_name',
    },
    {
      fields: ['user_id'],
      name: 'idx_category_user',
    },
  ],
});

export default InventoryCategory;
