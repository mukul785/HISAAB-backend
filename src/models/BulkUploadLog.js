import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const BulkUploadLog = sequelize.define('BulkUploadLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('processing', 'completed', 'failed', 'partial'),
    allowNull: false,
    defaultValue: 'processing',
  },
  total_rows: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  success_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  error_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  error_details: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'bulk_upload_logs',
  timestamps: false,
  indexes: [
    {
      fields: ['user_id'],
      name: 'idx_upload_log_user',
    },
    {
      fields: ['status'],
      name: 'idx_upload_log_status',
    },
  ],
});

export default BulkUploadLog;
