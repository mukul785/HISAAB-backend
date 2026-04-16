import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import { uploadSpreadsheet, uploadImage, handleUploadError } from '../middleware/upload.js';
import {
  getInventory,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustStock,
  getLowStockItems,
  getItemImages,
  addItemImage,
  deleteItemImage,
  setPrimaryImage,
  reorderImages,
  bulkUpload,
  getBulkUploadStatus,
  exportInventory,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/inventoryController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateJWT);

// ============ CATEGORIES (must be before /:id routes) ============

// List all categories
router.get('/categories', getCategories);

// Create category
router.post('/categories', createCategory);

// Update category
router.put('/categories/:id', updateCategory);

// Delete category
router.delete('/categories/:id', deleteCategory);

// ============ INVENTORY ITEMS ============

// List all items with pagination, filtering, search
router.get('/', getInventory);

// Get low stock items
router.get('/low-stock', getLowStockItems);

// Export inventory to spreadsheet
router.get('/export', exportInventory);

// Bulk upload from spreadsheet
router.post('/bulk-upload', uploadSpreadsheet, handleUploadError, bulkUpload);

// Get bulk upload status
router.get('/bulk-upload/:id', getBulkUploadStatus);

// Create single item
router.post('/', createInventoryItem);

// Get single item (must be after specific routes like /categories, /low-stock, /export)
router.get('/:id', getInventoryItem);

// Update item
router.put('/:id', updateInventoryItem);

// Delete item
router.delete('/:id', deleteInventoryItem);

// Adjust stock
router.patch('/:id/stock', adjustStock);

// ============ ITEM IMAGES (Multiple) ============

// Get all images for an item
router.get('/:id/images', getItemImages);

// Reorder images (must be before /:id/images/:imageId routes)
router.put('/:id/images/reorder', reorderImages);

// Add a new image to an item
router.post('/:id/images', uploadImage, handleUploadError, addItemImage);

// Set an image as primary
router.patch('/:id/images/:imageId/primary', setPrimaryImage);

// Delete a specific image
router.delete('/:id/images/:imageId', deleteItemImage);

export default router;
