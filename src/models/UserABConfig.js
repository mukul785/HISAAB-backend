import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

/**
 * UserABConfig model - stores user-specific A/B test configurations
 * Each record maps a user to a specific feature with their assigned value
 */
const UserABConfig = sequelize.define('UserABConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to the user',
  },
  feature_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to the AB feature',
  },
  value: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'A/B value for this user-feature combination (false = control, true = experiment)',
  },
  assigned_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When this user was assigned to this A/B group',
  },
  source: {
    type: DataTypes.ENUM('auto', 'manual', 'rollout'),
    allowNull: false,
    defaultValue: 'auto',
    comment: 'How this assignment was made (auto = random, manual = admin set, rollout = percentage based)',
  },
}, {
  tableName: 'user_ab_configs',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'feature_id'],
      name: 'user_feature_unique',
    },
    {
      fields: ['user_id'],
    },
    {
      fields: ['feature_id'],
    },
  ],
});

export default UserABConfig;
