import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const InventoryImage = sequelize.define('InventoryImage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  item_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  is_primary: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'inventory_images',
  timestamps: false,
  indexes: [
    {
      fields: ['item_id'],
      name: 'idx_inventory_image_item',
    },
    {
      fields: ['item_id', 'is_primary'],
      name: 'idx_inventory_image_primary',
    },
  ],
});

export default InventoryImage;
