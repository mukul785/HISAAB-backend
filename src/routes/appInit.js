import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import {
  appInit,
  getUserABValues,
  switchUserAB,
  getAllFeatures,
  createFeature,
  updateFeature,
  deleteFeature,
  getABValuesForUser,
  setABValueForUser,
  bulkAssignAB,
} from '../controllers/appInitController.js';

const router = express.Router();

// ============ USER ENDPOINTS (Authenticated) ============

/**
 * POST /api/app/init
 * Main app initialization endpoint
 * Body: { client: string, version: string, device_info?: object }
 * Response: { success, user, client_info, ab_flags, features_count, timestamp }
 */
router.post('/init', authenticateJWT, appInit);

/**
 * GET /api/app/ab
 * Get all AB values for the authenticated user
 * Response: { success, user_id, ab_values[], total_features }
 */
router.get('/ab', authenticateJWT, getUserABValues);

/**
 * PATCH /api/app/ab/:feature_key
 * Switch/toggle a particular AB for the authenticated user
 * Body: { value: 0|1|true|false }
 * Response: { success, feature_key, name, previous_value, new_value, message }
 */
router.patch('/ab/:feature_key', authenticateJWT, switchUserAB);

// ============ ADMIN ENDPOINTS ============
// Note: In production, add admin role check middleware

/**
 * GET /api/app/admin/features
 * Get all AB features with stats
 * Response: { success, features[], total }
 */
router.get('/admin/features', authenticateJWT, getAllFeatures);

/**
 * POST /api/app/admin/features
 * Create a new AB feature
 * Body: { feature_key, name, description?, default_value?, is_active?, rollout_percentage?, metadata? }
 * Response: { success, feature, message }
 */
router.post('/admin/features', authenticateJWT, createFeature);

/**
 * PATCH /api/app/admin/features/:feature_key
 * Update an existing AB feature
 * Body: { name?, description?, default_value?, is_active?, rollout_percentage?, metadata? }
 * Response: { success, feature, message }
 */
router.patch('/admin/features/:feature_key', authenticateJWT, updateFeature);

/**
 * DELETE /api/app/admin/features/:feature_key
 * Delete an AB feature and all user configs
 * Response: { success, message }
 */
router.delete('/admin/features/:feature_key', authenticateJWT, deleteFeature);

/**
 * GET /api/app/admin/users/:user_id/ab
 * Get AB values for a specific user
 * Response: { success, user, ab_values[], total_features }
 */
router.get('/admin/users/:user_id/ab', authenticateJWT, getABValuesForUser);

/**
 * PATCH /api/app/admin/users/:user_id/ab/:feature_key
 * Set AB value for a specific user
 * Body: { value: 0|1|true|false }
 * Response: { success, user_id, feature_key, previous_value, new_value, message }
 */
router.patch('/admin/users/:user_id/ab/:feature_key', authenticateJWT, setABValueForUser);

/**
 * POST /api/app/admin/features/:feature_key/bulk-assign
 * Bulk assign AB value to multiple users
 * Body: { user_ids: string[], value: 0|1|true|false }
 * Response: { success, feature_key, value, total_processed, successful, failed? }
 */
router.post('/admin/features/:feature_key/bulk-assign', authenticateJWT, bulkAssignAB);

export default router;
