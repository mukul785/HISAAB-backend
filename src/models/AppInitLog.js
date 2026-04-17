import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

/**
 * AppInitLog model - logs app initialization requests for analytics
 * Useful for tracking client versions, platforms, and user activity
 */
const AppInitLog = sequelize.define('AppInitLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Reference to the user (null for anonymous requests)',
  },
  client: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Client platform name (Android App, iOS App, Web, etc.)',
  },
  version: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Client platform version (1.1, 2.4, etc.)',
  },
  device_info: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional device information (OS version, device model, etc.)',
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Client IP address',
  },
  ab_snapshot: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Snapshot of AB values returned at this init',
  },
}, {
  tableName: 'app_init_logs',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id'],
    },
    {
      fields: ['client'],
    },
    {
      fields: ['version'],
    },
    {
      fields: ['createdAt'],
    },
  ],
});

export default AppInitLog;
