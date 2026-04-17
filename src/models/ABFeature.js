import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

/**
 * ABFeature model - stores all available A/B test features
 * Each feature has a unique key and can be toggled globally
 * Tracks which endpoints/screens/functionality each AB key controls
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
  
  // ============ FEATURE MAPPING ============
  affected_endpoints: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'List of API endpoints affected by this AB (e.g., ["/api/transactions", "/api/invoices/:id"])',
  },
  affected_screens: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'List of frontend screens/components affected (e.g., ["HomeScreen", "CheckoutFlow", "TransactionList"])',
  },
  affected_platforms: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: ['Android App', 'iOS App', 'Web'],
    comment: 'Which platforms this AB applies to',
  },
  control_behavior: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of behavior when AB=0 (control group)',
  },
  experiment_behavior: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of behavior when AB=1 (experiment group)',
  },
  
  // ============ EXPERIMENT DETAILS ============
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
  
  // ============ OWNERSHIP & TIMELINE ============
  owner: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Team or person responsible for this AB test',
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this AB test started/should start',
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this AB test ended/should end',
  },
  status: {
    type: DataTypes.ENUM('draft', 'running', 'paused', 'completed', 'archived'),
    allowNull: false,
    defaultValue: 'draft',
    comment: 'Current status of the AB test',
  },
  
  // ============ ADDITIONAL METADATA ============
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata (experiment_id, jira_ticket, analytics_event, etc.)',
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Tags for categorization (e.g., ["ui", "checkout", "performance"])',
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
    {
      fields: ['status'],
    },
    {
      fields: ['owner'],
    },
  ],
});

export default ABFeature;
