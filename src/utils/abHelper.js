import ABFeature from '../models/ABFeature.js';
import UserABConfig from '../models/UserABConfig.js';

/**
 * A/B Testing Utility Functions
 * Use these helpers in any controller to check user's AB values
 * and respond differently based on feature flags
 */

/**
 * Get a user's AB value for a specific feature
 * @param {string} userId - User's UUID
 * @param {string} featureKey - Feature key (e.g., 'csra', 'new_checkout')
 * @returns {Promise<boolean>} - true if user is in experiment group (AB=1), false otherwise
 * 
 * @example
 * // In a controller:
 * const useNewFeature = await getUserABValue(req.user.id, 'csra');
 * if (useNewFeature) {
 *   // Return new feature response
 * } else {
 *   // Return default response
 * }
 */
export const getUserABValue = async (userId, featureKey) => {
  try {
    const feature = await ABFeature.findOne({
      where: { feature_key: featureKey },
    });

    if (!feature || !feature.is_active) {
      return false; // Feature doesn't exist or is inactive, return default
    }

    const userConfig = await UserABConfig.findOne({
      where: {
        user_id: userId,
        feature_id: feature.id,
      },
    });

    if (userConfig) {
      return userConfig.value;
    }

    // User doesn't have this feature assigned, return default
    return feature.default_value;
  } catch (err) {
    console.error(`Error getting AB value for feature ${featureKey}:`, err);
    return false; // On error, return default (control group)
  }
};

/**
 * Get all AB values for a user as an object
 * @param {string} userId - User's UUID
 * @returns {Promise<Object>} - Object with feature_key: boolean pairs
 * 
 * @example
 * const abFlags = await getAllUserABValues(req.user.id);
 * // abFlags = { csra: true, new_checkout: false, dark_mode: true }
 */
export const getAllUserABValues = async (userId) => {
  try {
    const features = await ABFeature.findAll({
      where: { is_active: true },
    });

    const userConfigs = await UserABConfig.findAll({
      where: { user_id: userId },
    });

    const configMap = new Map(
      userConfigs.map(config => [config.feature_id, config.value])
    );

    const abValues = {};
    for (const feature of features) {
      const userValue = configMap.get(feature.id);
      abValues[feature.feature_key] = userValue !== undefined ? userValue : feature.default_value;
    }

    return abValues;
  } catch (err) {
    console.error('Error getting all AB values:', err);
    return {};
  }
};

/**
 * Check if user has a specific AB flag enabled (shorthand)
 * @param {Object} req - Express request object (must have req.user)
 * @param {string} featureKey - Feature key to check
 * @returns {Promise<boolean>}
 * 
 * @example
 * // In a controller:
 * if (await hasFeature(req, 'new_checkout')) {
 *   return res.json({ checkout_version: 'v2', ... });
 * }
 * return res.json({ checkout_version: 'v1', ... });
 */
export const hasFeature = async (req, featureKey) => {
  if (!req.user?.id) {
    return false;
  }
  return getUserABValue(req.user.id, featureKey);
};

/**
 * Middleware factory to require a specific AB flag
 * Returns 403 if user doesn't have the feature enabled
 * 
 * @param {string} featureKey - Feature key required
 * @returns {Function} Express middleware
 * 
 * @example
 * // In routes:
 * router.get('/new-feature', authenticateJWT, requireFeature('new_feature'), newFeatureController);
 */
export const requireFeature = (featureKey) => {
  return async (req, res, next) => {
    const hasFlag = await hasFeature(req, featureKey);
    if (!hasFlag) {
      return res.status(403).json({
        message: `Feature "${featureKey}" is not enabled for your account`,
        feature_key: featureKey,
      });
    }
    next();
  };
};

/**
 * Response helper that returns different data based on AB flag
 * @param {Object} req - Express request object
 * @param {string} featureKey - Feature key to check
 * @param {*} controlResponse - Response for AB=0 (control group)
 * @param {*} experimentResponse - Response for AB=1 (experiment group)
 * @returns {Promise<*>} - The appropriate response based on user's AB value
 * 
 * @example
 * const response = await abResponse(req, 'csra', 
 *   { version: 'v1', data: oldData },
 *   { version: 'v2', data: newData }
 * );
 * res.json(response);
 */
export const abResponse = async (req, featureKey, controlResponse, experimentResponse) => {
  const isExperiment = await hasFeature(req, featureKey);
  return isExperiment ? experimentResponse : controlResponse;
};
