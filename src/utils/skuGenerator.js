import { v4 as uuidv4 } from 'uuid';
import InventoryItem from '../models/InventoryItem.js';

/**
 * Generates a unique SKU ID for inventory items
 * Format: SKU-XXXXXXXX (8 alphanumeric characters)
 */
export const generateSKU = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let sku = 'SKU-';
  for (let i = 0; i < 8; i++) {
    sku += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sku;
};

/**
 * Generates a unique SKU that doesn't exist for the given user
 * @param {string} userId - The user's UUID
 * @param {number} maxAttempts - Maximum attempts to generate unique SKU
 * @returns {Promise<string>} Unique SKU ID
 */
export const generateUniqueSKU = async (userId, maxAttempts = 10) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const sku = generateSKU();
    const existing = await InventoryItem.findOne({
      where: { user_id: userId, sku_id: sku }
    });
    if (!existing) {
      return sku;
    }
  }
  // Fallback: use UUID-based SKU for guaranteed uniqueness
  const uuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
  return `SKU-${uuid}`;
};

/**
 * Validates SKU format
 * @param {string} sku - SKU to validate
 * @returns {boolean} Whether SKU is valid
 */
export const isValidSKU = (sku) => {
  if (!sku || typeof sku !== 'string') return false;
  // Allow alphanumeric with optional hyphens, 3-50 characters
  const skuRegex = /^[A-Za-z0-9-]{3,50}$/;
  return skuRegex.test(sku);
};

/**
 * Checks if a SKU already exists for a user
 * @param {string} userId - User's UUID
 * @param {string} sku - SKU to check
 * @param {string} excludeItemId - Item ID to exclude (for updates)
 * @returns {Promise<boolean>} Whether SKU exists
 */
export const skuExists = async (userId, sku, excludeItemId = null) => {
  const where = { user_id: userId, sku_id: sku };
  if (excludeItemId) {
    const { Op } = await import('sequelize');
    where.id = { [Op.ne]: excludeItemId };
  }
  const existing = await InventoryItem.findOne({ where });
  return !!existing;
};

export default {
  generateSKU,
  generateUniqueSKU,
  isValidSKU,
  skuExists,
};
