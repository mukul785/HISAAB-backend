import { Op } from 'sequelize';
import InventoryItem from '../models/InventoryItem.js';
import InventoryCategory from '../models/InventoryCategory.js';
import InventoryImage from '../models/InventoryImage.js';
import BulkUploadLog from '../models/BulkUploadLog.js';
import { generateUniqueSKU, isValidSKU, skuExists } from '../utils/skuGenerator.js';
import { parseSpreadsheet, transformRowToItem } from '../utils/spreadsheetParser.js';
import { deleteFile } from '../middleware/upload.js';
import sequelize from '../db.js';
import XLSX from 'xlsx';

// ============ INVENTORY ITEMS ============

/**
 * Get all inventory items for the authenticated user
 * Supports pagination, filtering, and search
 */
export const getInventory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 50,
      search,
      category_id,
      is_active,
      low_stock,
      sort = 'created_at',
      order = 'desc',
    } = req.query;

    // Build where clause
    const where = { user_id: userId };

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku_id: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (category_id) {
      where.category_id = category_id;
    }

    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    if (low_stock === 'true') {
      where.stock_quantity = {
        [Op.lte]: sequelize.col('low_stock_threshold'),
      };
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = limit === 'all' ? null : Math.max(1, Math.min(1000, parseInt(limit, 10)));
    const offset = limitNum ? (pageNum - 1) * limitNum : 0;

    // Valid sort fields
    const validSortFields = ['name', 'sku_id', 'stock_quantity', 'sell_price', 'cost_price', 'created_at', 'updated_at'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Query
    const queryOptions = {
      where,
      include: [
        { model: InventoryCategory, attributes: ['id', 'name'] },
        { model: InventoryImage, attributes: ['id', 'image_url', 'is_primary', 'sort_order'], order: [['sort_order', 'ASC']] },
      ],
      order: [[sortField, sortOrder]],
    };

    if (limitNum) {
      queryOptions.limit = limitNum;
      queryOptions.offset = offset;
    }

    const { count, rows: items } = await InventoryItem.findAndCountAll(queryOptions);

    res.json({
      items,
      pagination: {
        page: pageNum,
        limit: limitNum || count,
        total_items: count,
        total_pages: limitNum ? Math.ceil(count / limitNum) : 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get a single inventory item by ID
 */
export const getInventoryItem = async (req, res, next) => {
  try {
    const item = await InventoryItem.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      include: [
        { model: InventoryCategory, attributes: ['id', 'name'] },
        { model: InventoryImage, attributes: ['id', 'image_url', 'is_primary', 'sort_order'], order: [['sort_order', 'ASC']] },
      ],
    });

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    res.json(item);
  } catch (err) {
    next(err);
  }
};

/**
 * Create a single inventory item
 */
export const createInventoryItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      stock_quantity = 0,
      sell_price,
      cost_price,
      sku_id,
      auto_index = true,
      category_id,
      low_stock_threshold = 10,
    } = req.body;

    // Validate required fields
    if (!name || sell_price === undefined || cost_price === undefined) {
      return res.status(400).json({ message: 'name, sell_price, and cost_price are required' });
    }

    // Validate prices
    if (sell_price < 0 || cost_price < 0) {
      return res.status(400).json({ message: 'Prices must be non-negative' });
    }

    // Validate stock quantity
    if (stock_quantity < 0 || !Number.isInteger(Number(stock_quantity))) {
      return res.status(400).json({ message: 'Stock quantity must be a non-negative integer' });
    }

    // Validate category if provided
    if (category_id) {
      const category = await InventoryCategory.findOne({
        where: { id: category_id, user_id: userId },
      });
      if (!category) {
        return res.status(400).json({ message: 'Invalid category_id' });
      }
    }

    // Handle SKU
    let finalSKU;
    if (auto_index || !sku_id) {
      finalSKU = await generateUniqueSKU(userId);
    } else {
      if (!isValidSKU(sku_id)) {
        return res.status(400).json({ message: 'Invalid SKU format. Use alphanumeric characters and hyphens (3-50 chars)' });
      }
      if (await skuExists(userId, sku_id)) {
        return res.status(409).json({ message: 'SKU already exists for this user' });
      }
      finalSKU = sku_id;
    }

    const item = await InventoryItem.create({
      user_id: userId,
      name,
      description,
      stock_quantity: parseInt(stock_quantity, 10),
      sell_price: parseFloat(sell_price),
      cost_price: parseFloat(cost_price),
      sku_id: finalSKU,
      auto_index: auto_index || !sku_id,
      category_id: category_id || null,
      low_stock_threshold: parseInt(low_stock_threshold, 10),
      created_at: new Date(),
      updated_at: new Date(),
    });

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an inventory item
 */
export const updateInventoryItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const item = await InventoryItem.findOne({
      where: { id: req.params.id, user_id: userId },
    });

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const {
      name,
      description,
      stock_quantity,
      sell_price,
      cost_price,
      sku_id,
      category_id,
      is_active,
      low_stock_threshold,
    } = req.body;

    // Update fields if provided
    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description;
    if (stock_quantity !== undefined) {
      if (stock_quantity < 0 || !Number.isInteger(Number(stock_quantity))) {
        return res.status(400).json({ message: 'Stock quantity must be a non-negative integer' });
      }
      item.stock_quantity = parseInt(stock_quantity, 10);
    }
    if (sell_price !== undefined) {
      if (sell_price < 0) return res.status(400).json({ message: 'Sell price must be non-negative' });
      item.sell_price = parseFloat(sell_price);
    }
    if (cost_price !== undefined) {
      if (cost_price < 0) return res.status(400).json({ message: 'Cost price must be non-negative' });
      item.cost_price = parseFloat(cost_price);
    }
    if (sku_id !== undefined && sku_id !== item.sku_id) {
      if (!isValidSKU(sku_id)) {
        return res.status(400).json({ message: 'Invalid SKU format' });
      }
      if (await skuExists(userId, sku_id, item.id)) {
        return res.status(409).json({ message: 'SKU already exists' });
      }
      item.sku_id = sku_id;
      item.auto_index = false;
    }
    if (category_id !== undefined) {
      if (category_id === null) {
        item.category_id = null;
      } else {
        const category = await InventoryCategory.findOne({
          where: { id: category_id, user_id: userId },
        });
        if (!category) return res.status(400).json({ message: 'Invalid category_id' });
        item.category_id = category_id;
      }
    }
    if (is_active !== undefined) item.is_active = is_active;
    if (low_stock_threshold !== undefined) {
      item.low_stock_threshold = parseInt(low_stock_threshold, 10);
    }

    item.updated_at = new Date();
    await item.save();

    res.json(item);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete an inventory item
 */
export const deleteInventoryItem = async (req, res, next) => {
  try {
    const item = await InventoryItem.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      include: [InventoryImage],
    });

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Delete all associated images from filesystem
    if (item.InventoryImages && item.InventoryImages.length > 0) {
      for (const image of item.InventoryImages) {
        deleteFile(image.image_url.replace(/^\//, ''));
      }
    }

    // Also delete legacy single image if exists
    if (item.image_url) {
      deleteFile(item.image_url.replace(/^\//, ''));
    }

    await item.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

/**
 * Adjust stock quantity (increment or decrement)
 */
export const adjustStock = async (req, res, next) => {
  try {
    const item = await InventoryItem.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const { adjustment, reason } = req.body;

    if (adjustment === undefined || !Number.isInteger(adjustment)) {
      return res.status(400).json({ message: 'adjustment must be an integer' });
    }

    const newQuantity = item.stock_quantity + adjustment;
    if (newQuantity < 0) {
      return res.status(400).json({ message: 'Stock cannot go negative' });
    }

    item.stock_quantity = newQuantity;
    item.updated_at = new Date();
    await item.save();

    res.json({
      id: item.id,
      name: item.name,
      sku_id: item.sku_id,
      previous_quantity: item.stock_quantity - adjustment,
      adjustment_applied: adjustment,
      stock_quantity: item.stock_quantity,
      reason: reason || null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get low stock items
 */
export const getLowStockItems = async (req, res, next) => {
  try {
    const items = await InventoryItem.findAll({
      where: {
        user_id: req.user.id,
        is_active: true,
        stock_quantity: {
          [Op.lte]: sequelize.col('low_stock_threshold'),
        },
      },
      include: [{ model: InventoryCategory, attributes: ['id', 'name'] }],
      order: [['stock_quantity', 'ASC']],
    });

    res.json({
      items,
      count: items.length,
    });
  } catch (err) {
    next(err);
  }
};

// ============ ITEM IMAGES (Multiple) ============

/**
 * Get all images for an inventory item
 */
export const getItemImages = async (req, res, next) => {
  try {
    const item = await InventoryItem.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const images = await InventoryImage.findAll({
      where: { item_id: item.id },
      order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
    });

    res.json({
      item_id: item.id,
      images,
      count: images.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Add a new image to an inventory item
 */
export const addItemImage = async (req, res, next) => {
  try {
    const item = await InventoryItem.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!item) {
      if (req.file) deleteFile(req.file.path);
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Check existing image count (limit to 10 images per item)
    const existingCount = await InventoryImage.count({ where: { item_id: item.id } });
    if (existingCount >= 10) {
      deleteFile(req.file.path);
      return res.status(400).json({ message: 'Maximum 10 images allowed per item' });
    }

    // Get the next sort order
    const maxSortOrder = await InventoryImage.max('sort_order', { where: { item_id: item.id } });
    const sortOrder = (maxSortOrder || 0) + 1;

    // Determine if this should be primary (first image is automatically primary)
    const isPrimary = existingCount === 0;

    const imageUrl = `/${req.file.path.replace(/\\/g, '/')}`;

    const image = await InventoryImage.create({
      item_id: item.id,
      image_url: imageUrl,
      is_primary: isPrimary,
      sort_order: sortOrder,
      created_at: new Date(),
    });

    // Update item's legacy image_url field with primary image for backward compatibility
    if (isPrimary) {
      item.image_url = imageUrl;
      item.updated_at = new Date();
      await item.save();
    }

    res.status(201).json(image);
  } catch (err) {
    if (req.file) deleteFile(req.file.path);
    next(err);
  }
};

/**
 * Delete a specific image from an inventory item
 */
export const deleteItemImage = async (req, res, next) => {
  try {
    const { id: itemId, imageId } = req.params;

    const item = await InventoryItem.findOne({
      where: { id: itemId, user_id: req.user.id },
    });

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const image = await InventoryImage.findOne({
      where: { id: imageId, item_id: itemId },
    });

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Delete file from filesystem
    deleteFile(image.image_url.replace(/^\//, ''));

    const wasPrimary = image.is_primary;
    await image.destroy();

    // If deleted image was primary, set another image as primary
    if (wasPrimary) {
      const nextImage = await InventoryImage.findOne({
        where: { item_id: itemId },
        order: [['sort_order', 'ASC']],
      });

      if (nextImage) {
        nextImage.is_primary = true;
        await nextImage.save();
        item.image_url = nextImage.image_url;
      } else {
        item.image_url = null;
      }
      item.updated_at = new Date();
      await item.save();
    }

    res.json({ message: 'Image deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * Set an image as the primary image for an item
 */
export const setPrimaryImage = async (req, res, next) => {
  try {
    const { id: itemId, imageId } = req.params;

    const item = await InventoryItem.findOne({
      where: { id: itemId, user_id: req.user.id },
    });

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const image = await InventoryImage.findOne({
      where: { id: imageId, item_id: itemId },
    });

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Remove primary flag from all images for this item
    await InventoryImage.update(
      { is_primary: false },
      { where: { item_id: itemId } }
    );

    // Set the selected image as primary
    image.is_primary = true;
    await image.save();

    // Update legacy image_url for backward compatibility
    item.image_url = image.image_url;
    item.updated_at = new Date();
    await item.save();

    res.json({
      message: 'Primary image updated',
      image,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reorder images for an inventory item
 */
export const reorderImages = async (req, res, next) => {
  try {
    const { id: itemId } = req.params;
    const { image_order } = req.body; // Array of image IDs in desired order

    if (!image_order || !Array.isArray(image_order)) {
      return res.status(400).json({ message: 'image_order must be an array of image IDs' });
    }

    const item = await InventoryItem.findOne({
      where: { id: itemId, user_id: req.user.id },
    });

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Validate all image IDs belong to this item
    const images = await InventoryImage.findAll({
      where: { item_id: itemId },
    });

    const imageIds = images.map(img => img.id);
    const invalidIds = image_order.filter(id => !imageIds.includes(id));

    if (invalidIds.length > 0) {
      return res.status(400).json({ message: `Invalid image IDs: ${invalidIds.join(', ')}` });
    }

    // Update sort_order for each image
    await sequelize.transaction(async (t) => {
      for (let i = 0; i < image_order.length; i++) {
        await InventoryImage.update(
          { sort_order: i + 1 },
          { where: { id: image_order[i], item_id: itemId }, transaction: t }
        );
      }
    });

    // Get updated images
    const updatedImages = await InventoryImage.findAll({
      where: { item_id: itemId },
      order: [['sort_order', 'ASC']],
    });

    res.json({
      message: 'Image order updated',
      images: updatedImages,
    });
  } catch (err) {
    next(err);
  }
};

// ============ BULK UPLOAD ============

/**
 * Bulk upload inventory items from spreadsheet
 */
export const bulkUpload = async (req, res, next) => {
  const filePath = req.file?.path;
  
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    // Create upload log
    const uploadLog = await BulkUploadLog.create({
      user_id: userId,
      filename: req.file.originalname,
      status: 'processing',
      created_at: new Date(),
    });

    try {
      // Parse spreadsheet
      const parsed = parseSpreadsheet(filePath);
      uploadLog.total_rows = parsed.totalRows;

      // Get existing categories for mapping
      const categories = await InventoryCategory.findAll({
        where: { user_id: userId },
      });
      const categoryMap = {};
      categories.forEach(cat => {
        categoryMap[cat.name.toLowerCase()] = cat.id;
      });

      // Process rows within transaction
      const results = await sequelize.transaction(async (t) => {
        const successItems = [];
        const errors = [...parsed.errors];

        for (const rowData of parsed.rows) {
          if (rowData.errors.length > 0) continue;

          try {
            const itemData = transformRowToItem(rowData, userId, categoryMap);

            // Generate SKU if needed
            if (itemData.auto_index || !itemData.sku_id) {
              itemData.sku_id = await generateUniqueSKU(userId);
            } else if (await skuExists(userId, itemData.sku_id)) {
              errors.push({
                row: rowData.rowNumber,
                field: 'sku_id',
                error: `SKU "${itemData.sku_id}" already exists`,
              });
              continue;
            }

            // Create category if it doesn't exist
            if (rowData.data.category && !itemData.category_id) {
              const categoryName = String(rowData.data.category).trim();
              const [category] = await InventoryCategory.findOrCreate({
                where: { user_id: userId, name: categoryName },
                defaults: {
                  user_id: userId,
                  name: categoryName,
                  created_at: new Date(),
                  updated_at: new Date(),
                },
                transaction: t,
              });
              itemData.category_id = category.id;
              categoryMap[categoryName.toLowerCase()] = category.id;
            }

            const item = await InventoryItem.create({
              ...itemData,
              created_at: new Date(),
              updated_at: new Date(),
            }, { transaction: t });

            successItems.push(item);
          } catch (err) {
            errors.push({
              row: rowData.rowNumber,
              error: err.message,
            });
          }
        }

        return { successItems, errors };
      });

      // Update upload log
      uploadLog.success_count = results.successItems.length;
      uploadLog.error_count = results.errors.length;
      uploadLog.error_details = results.errors;
      uploadLog.status = results.errors.length === 0 ? 'completed' :
        results.successItems.length === 0 ? 'failed' : 'partial';
      await uploadLog.save();

      // Cleanup temp file
      deleteFile(filePath);

      res.status(202).json({
        upload_id: uploadLog.id,
        status: uploadLog.status,
        total_rows: uploadLog.total_rows,
        success_count: uploadLog.success_count,
        error_count: uploadLog.error_count,
        error_details: uploadLog.error_details,
      });
    } catch (parseErr) {
      uploadLog.status = 'failed';
      uploadLog.error_details = [{ error: parseErr.message }];
      await uploadLog.save();
      deleteFile(filePath);
      return res.status(400).json({ message: parseErr.message });
    }
  } catch (err) {
    if (filePath) deleteFile(filePath);
    next(err);
  }
};

/**
 * Get bulk upload status
 */
export const getBulkUploadStatus = async (req, res, next) => {
  try {
    const uploadLog = await BulkUploadLog.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!uploadLog) {
      return res.status(404).json({ message: 'Upload log not found' });
    }

    res.json(uploadLog);
  } catch (err) {
    next(err);
  }
};

/**
 * Export inventory to spreadsheet
 */
export const exportInventory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { format = 'xlsx' } = req.query;

    const items = await InventoryItem.findAll({
      where: { user_id: userId },
      include: [{ model: InventoryCategory, attributes: ['name'] }],
      order: [['name', 'ASC']],
    });

    // Transform data for export
    const exportData = items.map(item => ({
      name: item.name,
      stock_quantity: item.stock_quantity,
      sell_price: item.sell_price,
      cost_price: item.cost_price,
      sku_id: item.sku_id,
      category: item.InventoryCategory?.name || '',
      description: item.description || '',
      low_stock_threshold: item.low_stock_threshold,
      is_active: item.is_active ? 'Yes' : 'No',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: format === 'csv' ? 'csv' : 'xlsx' });

    const filename = `inventory_export_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

// ============ CATEGORIES ============

/**
 * Get all categories
 */
export const getCategories = async (req, res, next) => {
  try {
    const categories = await InventoryCategory.findAll({
      where: { user_id: req.user.id },
      order: [['name', 'ASC']],
    });
    res.json(categories);
  } catch (err) {
    next(err);
  }
};

/**
 * Create a category
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Check for duplicate
    const existing = await InventoryCategory.findOne({
      where: { user_id: req.user.id, name },
    });
    if (existing) {
      return res.status(409).json({ message: 'Category already exists' });
    }

    const category = await InventoryCategory.create({
      user_id: req.user.id,
      name,
      description,
      created_at: new Date(),
      updated_at: new Date(),
    });

    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
};

/**
 * Update a category
 */
export const updateCategory = async (req, res, next) => {
  try {
    const category = await InventoryCategory.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const { name, description } = req.body;

    if (name !== undefined) {
      // Check for duplicate name
      const existing = await InventoryCategory.findOne({
        where: {
          user_id: req.user.id,
          name,
          id: { [Op.ne]: category.id },
        },
      });
      if (existing) {
        return res.status(409).json({ message: 'Category name already exists' });
      }
      category.name = name;
    }
    if (description !== undefined) category.description = description;

    category.updated_at = new Date();
    await category.save();

    res.json(category);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a category
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await InventoryCategory.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Set category_id to null for all items in this category
    await InventoryItem.update(
      { category_id: null, updated_at: new Date() },
      { where: { category_id: category.id, user_id: req.user.id } }
    );

    await category.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export default {
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
};
