import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

/**
 * ABFeature model - stores all available A/B test features
 * Each feature has a unique key and can be toggled globally
 */
const ABFeature = sequelize.define('ABFeature', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  feature_key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Unique identifier for the feature (e.g., "csra", "new_checkout", "dark_mode")',
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Human-readable name for the feature',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of what this A/B feature controls',
  },
  default_value: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Default value for new users (false = control group, true = experiment group)',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this feature is currently being tested (inactive features use default_value)',
  },
  rollout_percentage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100,
    },
    comment: 'Percentage of new users to automatically assign to experiment group (0-100)',
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata for the feature (e.g., experiment details, variants info)',
  },
}, {
  tableName: 'ab_features',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['feature_key'],
    },
    {
      fields: ['is_active'],
    },
  ],
});

export default ABFeature;
