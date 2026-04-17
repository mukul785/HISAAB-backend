import ABFeature from '../models/ABFeature.js';
import UserABConfig from '../models/UserABConfig.js';
import AppInitLog from '../models/AppInitLog.js';
import User from '../models/User.js';
import sequelize from '../db.js';
import { Op } from 'sequelize';

/**
 * App Initialization Controller
 * Handles app init requests and A/B testing management
 */

/**
 * POST /api/app/init
 * Main app initialization endpoint
 * Returns user's A/B configuration and app settings
 */
export const appInit = async (req, res, next) => {
  try {
    const { client, version, device_info } = req.body;
    const user = req.user; // From authenticateJWT middleware

    // Validate required fields
    if (!client || typeof client !== 'string') {
      return res.status(400).json({ 
        message: 'client is required and must be a string (e.g., "Android App", "iOS App", "Web")' 
      });
    }
    if (!version || typeof version !== 'string') {
      return res.status(400).json({ 
        message: 'version is required and must be a string (e.g., "1.1", "2.4")' 
      });
    }

    // Get all active AB features
    const activeFeatures = await ABFeature.findAll({
      where: { is_active: true },
      order: [['feature_key', 'ASC']],
    });

    // Get user's existing AB configurations
    const existingConfigs = await UserABConfig.findAll({
      where: { user_id: user.id },
      include: [{
        model: ABFeature,
        as: 'feature',
        required: false,
      }],
    });

    // Create a map of existing configs by feature_id
    const existingConfigMap = new Map(
      existingConfigs.map(config => [config.feature_id, config])
    );

    // Build AB values response and assign missing features
    const abValues = {};
    const newConfigs = [];

    for (const feature of activeFeatures) {
      let config = existingConfigMap.get(feature.id);

      if (!config) {
        // User doesn't have this feature assigned, assign based on rollout percentage
        const shouldBeInExperiment = Math.random() * 100 < feature.rollout_percentage;
        const assignedValue = shouldBeInExperiment ? true : feature.default_value;

        config = await UserABConfig.create({
          user_id: user.id,
          feature_id: feature.id,
          value: assignedValue,
          source: shouldBeInExperiment ? 'rollout' : 'auto',
        });

        newConfigs.push(config);
      }

      // Add to response with feature_key as key (e.g., "csra": 0 or 1)
      abValues[feature.feature_key] = config.value ? 1 : 0;
    }

    // Prepare response
    const response = {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      client_info: {
        client,
        version,
      },
      ab_flags: abValues,
      features_count: Object.keys(abValues).length,
      timestamp: new Date().toISOString(),
    };

    // Log the app init request (async, don't await)
    AppInitLog.create({
      user_id: user.id,
      client,
      version,
      device_info: device_info || null,
      ip_address: req.ip || req.connection?.remoteAddress || null,
      ab_snapshot: abValues,
    }).catch(err => console.error('Failed to log app init:', err));

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/app/ab
 * Get all AB values for the authenticated user
 */
export const getUserABValues = async (req, res, next) => {
  try {
    const user = req.user;

    // Get all AB features with user's configuration
    const features = await ABFeature.findAll({
      where: { is_active: true },
      order: [['feature_key', 'ASC']],
    });

    const userConfigs = await UserABConfig.findAll({
      where: { user_id: user.id },
    });

    const configMap = new Map(
      userConfigs.map(config => [config.feature_id, config])
    );

    const abValues = features.map(feature => {
      const config = configMap.get(feature.id);
      return {
        feature_key: feature.feature_key,
        name: feature.name,
        description: feature.description,
        value: config ? (config.value ? 1 : 0) : (feature.default_value ? 1 : 0),
        is_assigned: !!config,
        assigned_at: config?.assigned_at || null,
        source: config?.source || null,
      };
    });

    res.status(200).json({
      success: true,
      user_id: user.id,
      ab_values: abValues,
      total_features: abValues.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/app/ab/:feature_key
 * Switch/toggle a particular AB for the authenticated user
 */
export const switchUserAB = async (req, res, next) => {
  try {
    const user = req.user;
    const { feature_key } = req.params;
    const { value } = req.body;

    // Validate value
    if (value === undefined || (value !== 0 && value !== 1 && value !== true && value !== false)) {
      return res.status(400).json({ 
        message: 'value is required and must be 0, 1, true, or false' 
      });
    }

    // Find the feature
    const feature = await ABFeature.findOne({
      where: { feature_key },
    });

    if (!feature) {
      return res.status(404).json({ 
        message: `Feature "${feature_key}" not found` 
      });
    }

    // Convert value to boolean
    const boolValue = value === 1 || value === true;

    // Find or create user's config for this feature
    const [config, created] = await UserABConfig.findOrCreate({
      where: {
        user_id: user.id,
        feature_id: feature.id,
      },
      defaults: {
        value: boolValue,
        source: 'manual',
      },
    });

    if (!created) {
      // Update existing config
      await config.update({
        value: boolValue,
        source: 'manual',
      });
    }

    res.status(200).json({
      success: true,
      feature_key: feature.feature_key,
      name: feature.name,
      previous_value: created ? null : (config.value ? 1 : 0),
      new_value: boolValue ? 1 : 0,
      message: `A/B flag "${feature_key}" ${created ? 'set' : 'updated'} to ${boolValue ? 1 : 0}`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/app/lookup
 * Find which AB features affect a specific endpoint or screen
 * Query params: endpoint, screen
 * This helps developers quickly find which AB controls a feature
 */
export const lookupABByFeature = async (req, res, next) => {
  try {
    const { endpoint, screen } = req.query;

    if (!endpoint && !screen) {
      return res.status(400).json({
        message: 'Please provide either endpoint or screen query parameter',
        example: '/api/app/lookup?endpoint=/api/transactions or /api/app/lookup?screen=HomeScreen',
      });
    }

    const allFeatures = await ABFeature.findAll({
      where: { is_active: true },
      order: [['feature_key', 'ASC']],
    });

    let matchingFeatures = [];

    if (endpoint) {
      matchingFeatures = allFeatures.filter(f =>
        f.affected_endpoints && f.affected_endpoints.some(e => 
          e.includes(endpoint) || endpoint.includes(e)
        )
      );
    }

    if (screen) {
      const screenMatches = allFeatures.filter(f =>
        f.affected_screens && f.affected_screens.some(s =>
          s.toLowerCase().includes(screen.toLowerCase()) ||
          screen.toLowerCase().includes(s.toLowerCase())
        )
      );
      // Combine results, avoiding duplicates
      matchingFeatures = [...new Set([...matchingFeatures, ...screenMatches])];
    }

    const result = matchingFeatures.map(f => ({
      feature_key: f.feature_key,
      name: f.name,
      description: f.description,
      affected_endpoints: f.affected_endpoints,
      affected_screens: f.affected_screens,
      control_behavior: f.control_behavior,
      experiment_behavior: f.experiment_behavior,
      status: f.status,
      owner: f.owner,
    }));

    res.status(200).json({
      success: true,
      query: { endpoint, screen },
      matching_features: result,
      count: result.length,
    });
  } catch (err) {
    next(err);
  }
};

// ============ ADMIN ENDPOINTS ============

/**
 * GET /api/app/admin/features
 * Get all AB features with optional filtering (admin only)
 * Query params: status, owner, tag, endpoint, screen, platform
 */
export const getAllFeatures = async (req, res, next) => {
  try {
    const { status, owner, tag, endpoint, screen, platform, search } = req.query;
    
    // Build where clause
    const where = {};
    if (status) where.status = status;
    if (owner) where.owner = owner;
    
    let features = await ABFeature.findAll({
      where,
      order: [['feature_key', 'ASC']],
    });

    // Filter by tag (JSON array contains)
    if (tag) {
      features = features.filter(f => f.tags && f.tags.includes(tag));
    }
    
    // Filter by affected endpoint
    if (endpoint) {
      features = features.filter(f => 
        f.affected_endpoints && f.affected_endpoints.some(e => e.includes(endpoint))
      );
    }
    
    // Filter by affected screen
    if (screen) {
      features = features.filter(f => 
        f.affected_screens && f.affected_screens.some(s => 
          s.toLowerCase().includes(screen.toLowerCase())
        )
      );
    }
    
    // Filter by platform
    if (platform) {
      features = features.filter(f => 
        f.affected_platforms && f.affected_platforms.includes(platform)
      );
    }
    
    // Search in feature_key, name, description
    if (search) {
      const searchLower = search.toLowerCase();
      features = features.filter(f => 
        f.feature_key.toLowerCase().includes(searchLower) ||
        f.name.toLowerCase().includes(searchLower) ||
        (f.description && f.description.toLowerCase().includes(searchLower))
      );
    }

    // Get usage stats for each feature
    const stats = await UserABConfig.findAll({
      attributes: [
        'feature_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_users'],
        [sequelize.fn('SUM', sequelize.cast(sequelize.col('value'), 'INTEGER')), 'experiment_users'],
      ],
      group: ['feature_id'],
    });

    const statsMap = new Map(
      stats.map(s => [s.feature_id, {
        total_users: parseInt(s.dataValues.total_users) || 0,
        experiment_users: parseInt(s.dataValues.experiment_users) || 0,
      }])
    );

    const featuresWithStats = features.map(feature => ({
      ...feature.toJSON(),
      stats: statsMap.get(feature.id) || { total_users: 0, experiment_users: 0 },
    }));

    res.status(200).json({
      success: true,
      features: featuresWithStats,
      total: features.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/app/admin/features
 * Create a new AB feature (admin only)
 */
export const createFeature = async (req, res, next) => {
  try {
    const { 
      feature_key, 
      name, 
      description, 
      default_value, 
      is_active, 
      rollout_percentage, 
      metadata,
      // New fields for feature mapping
      affected_endpoints,
      affected_screens,
      affected_platforms,
      control_behavior,
      experiment_behavior,
      owner,
      start_date,
      end_date,
      status,
      tags,
    } = req.body;

    // Validate required fields
    if (!feature_key || typeof feature_key !== 'string') {
      return res.status(400).json({ message: 'feature_key is required and must be a string' });
    }
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'name is required and must be a string' });
    }

    // Check for existing feature
    const existing = await ABFeature.findOne({ where: { feature_key } });
    if (existing) {
      return res.status(409).json({ message: `Feature "${feature_key}" already exists` });
    }

    // Validate rollout_percentage if provided
    if (rollout_percentage !== undefined && (rollout_percentage < 0 || rollout_percentage > 100)) {
      return res.status(400).json({ message: 'rollout_percentage must be between 0 and 100' });
    }

    // Validate arrays
    if (affected_endpoints && !Array.isArray(affected_endpoints)) {
      return res.status(400).json({ message: 'affected_endpoints must be an array' });
    }
    if (affected_screens && !Array.isArray(affected_screens)) {
      return res.status(400).json({ message: 'affected_screens must be an array' });
    }
    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({ message: 'tags must be an array' });
    }

    const feature = await ABFeature.create({
      feature_key,
      name,
      description: description || null,
      default_value: default_value ?? false,
      is_active: is_active ?? true,
      rollout_percentage: rollout_percentage ?? 0,
      metadata: metadata || null,
      // Feature mapping
      affected_endpoints: affected_endpoints || [],
      affected_screens: affected_screens || [],
      affected_platforms: affected_platforms || ['Android App', 'iOS App', 'Web'],
      control_behavior: control_behavior || null,
      experiment_behavior: experiment_behavior || null,
      // Ownership & timeline
      owner: owner || null,
      start_date: start_date || null,
      end_date: end_date || null,
      status: status || 'draft',
      tags: tags || [],
    });

    res.status(201).json({
      success: true,
      feature,
      message: `Feature "${feature_key}" created successfully`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/app/admin/features/:feature_key
 * Update an AB feature (admin only)
 */
export const updateFeature = async (req, res, next) => {
  try {
    const { feature_key } = req.params;
    const updates = req.body;

    const feature = await ABFeature.findOne({ where: { feature_key } });
    if (!feature) {
      return res.status(404).json({ message: `Feature "${feature_key}" not found` });
    }

    // Validate rollout_percentage if provided
    if (updates.rollout_percentage !== undefined && 
        (updates.rollout_percentage < 0 || updates.rollout_percentage > 100)) {
      return res.status(400).json({ message: 'rollout_percentage must be between 0 and 100' });
    }

    // Don't allow changing feature_key
    delete updates.feature_key;
    delete updates.id;

    await feature.update(updates);

    res.status(200).json({
      success: true,
      feature,
      message: `Feature "${feature_key}" updated successfully`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/app/admin/features/:feature_key
 * Delete an AB feature and all associated user configs (admin only)
 */
export const deleteFeature = async (req, res, next) => {
  try {
    const { feature_key } = req.params;

    const feature = await ABFeature.findOne({ where: { feature_key } });
    if (!feature) {
      return res.status(404).json({ message: `Feature "${feature_key}" not found` });
    }

    // Delete all user configs for this feature
    const deletedConfigs = await UserABConfig.destroy({
      where: { feature_id: feature.id },
    });

    // Delete the feature
    await feature.destroy();

    res.status(200).json({
      success: true,
      message: `Feature "${feature_key}" deleted along with ${deletedConfigs} user configurations`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/app/admin/users/:user_id/ab
 * Get AB values for a specific user (admin only)
 */
export const getABValuesForUser = async (req, res, next) => {
  try {
    const { user_id } = req.params;

    // Verify user exists
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all features and user's configs
    const features = await ABFeature.findAll({
      order: [['feature_key', 'ASC']],
    });

    const userConfigs = await UserABConfig.findAll({
      where: { user_id },
    });

    const configMap = new Map(
      userConfigs.map(config => [config.feature_id, config])
    );

    const abValues = features.map(feature => {
      const config = configMap.get(feature.id);
      return {
        feature_key: feature.feature_key,
        name: feature.name,
        is_active: feature.is_active,
        value: config ? (config.value ? 1 : 0) : (feature.default_value ? 1 : 0),
        is_assigned: !!config,
        assigned_at: config?.assigned_at || null,
        source: config?.source || null,
      };
    });

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      ab_values: abValues,
      total_features: abValues.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/app/admin/users/:user_id/ab/:feature_key
 * Set AB value for a specific user (admin only)
 */
export const setABValueForUser = async (req, res, next) => {
  try {
    const { user_id, feature_key } = req.params;
    const { value } = req.body;

    // Validate value
    if (value === undefined || (value !== 0 && value !== 1 && value !== true && value !== false)) {
      return res.status(400).json({ 
        message: 'value is required and must be 0, 1, true, or false' 
      });
    }

    // Verify user exists
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the feature
    const feature = await ABFeature.findOne({ where: { feature_key } });
    if (!feature) {
      return res.status(404).json({ message: `Feature "${feature_key}" not found` });
    }

    const boolValue = value === 1 || value === true;

    // Find or create user's config
    const [config, created] = await UserABConfig.findOrCreate({
      where: {
        user_id,
        feature_id: feature.id,
      },
      defaults: {
        value: boolValue,
        source: 'manual',
      },
    });

    const previousValue = created ? null : (config.value ? 1 : 0);

    if (!created) {
      await config.update({
        value: boolValue,
        source: 'manual',
      });
    }

    res.status(200).json({
      success: true,
      user_id,
      feature_key,
      previous_value: previousValue,
      new_value: boolValue ? 1 : 0,
      message: `A/B flag "${feature_key}" for user ${user_id} ${created ? 'set' : 'updated'} to ${boolValue ? 1 : 0}`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/app/admin/features/:feature_key/bulk-assign
 * Bulk assign AB value to multiple users (admin only)
 */
export const bulkAssignAB = async (req, res, next) => {
  try {
    const { feature_key } = req.params;
    const { user_ids, value } = req.body;

    // Validate inputs
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ message: 'user_ids must be a non-empty array' });
    }
    if (value === undefined || (value !== 0 && value !== 1 && value !== true && value !== false)) {
      return res.status(400).json({ 
        message: 'value is required and must be 0, 1, true, or false' 
      });
    }

    const feature = await ABFeature.findOne({ where: { feature_key } });
    if (!feature) {
      return res.status(404).json({ message: `Feature "${feature_key}" not found` });
    }

    const boolValue = value === 1 || value === true;

    // Use upsert for each user
    const results = await Promise.all(
      user_ids.map(async (user_id) => {
        try {
          const [config, created] = await UserABConfig.findOrCreate({
            where: { user_id, feature_id: feature.id },
            defaults: { value: boolValue, source: 'manual' },
          });

          if (!created) {
            await config.update({ value: boolValue, source: 'manual' });
          }

          return { user_id, success: true, created };
        } catch (err) {
          return { user_id, success: false, error: err.message };
        }
      })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    res.status(200).json({
      success: true,
      feature_key,
      value: boolValue ? 1 : 0,
      total_processed: user_ids.length,
      successful,
      failed: failed.length > 0 ? failed : undefined,
    });
  } catch (err) {
    next(err);
  }
};
