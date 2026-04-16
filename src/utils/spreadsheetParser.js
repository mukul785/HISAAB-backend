import XLSX from 'xlsx';
import fs from 'fs';

/**
 * Required columns for inventory bulk upload
 */
const REQUIRED_COLUMNS = ['name', 'stock_quantity', 'sell_price', 'cost_price'];

/**
 * Optional columns for inventory bulk upload
 */
const OPTIONAL_COLUMNS = ['sku_id', 'category', 'description', 'low_stock_threshold'];

/**
 * All valid columns
 */
const VALID_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

/**
 * Normalizes column headers (lowercase, trim, replace spaces with underscores)
 * @param {string} header - Column header
 * @returns {string} Normalized header
 */
const normalizeHeader = (header) => {
  if (!header) return '';
  return String(header).toLowerCase().trim().replace(/\s+/g, '_');
};

/**
 * Parses a spreadsheet file (Excel or CSV) and returns structured data
 * @param {string} filePath - Path to the spreadsheet file
 * @returns {Object} Parsed data with rows and metadata
 */
export const parseSpreadsheet = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found');
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  
  if (!sheetName) {
    throw new Error('No sheets found in the spreadsheet');
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (rawData.length < 2) {
    throw new Error('Spreadsheet must have at least a header row and one data row');
  }

  // Extract and normalize headers
  const headers = rawData[0].map(normalizeHeader);
  
  // Validate required columns
  const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  // Map column indices
  const columnMap = {};
  headers.forEach((header, index) => {
    if (VALID_COLUMNS.includes(header)) {
      columnMap[header] = index;
    }
  });

  // Parse data rows
  const rows = [];
  const errors = [];

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    const rowNumber = i + 1; // 1-indexed for user display

    // Skip empty rows
    if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
      continue;
    }

    const rowData = {
      rowNumber,
      data: {},
      errors: [],
    };

    // Extract values for each column
    for (const [column, index] of Object.entries(columnMap)) {
      let value = row[index];
      
      // Trim strings
      if (typeof value === 'string') {
        value = value.trim();
      }

      rowData.data[column] = value;
    }

    // Validate row data
    const rowErrors = validateRow(rowData.data, rowNumber);
    if (rowErrors.length > 0) {
      rowData.errors = rowErrors;
      errors.push(...rowErrors);
    }

    rows.push(rowData);
  }

  return {
    totalRows: rows.length,
    headers: headers.filter(h => VALID_COLUMNS.includes(h)),
    rows,
    errors,
    hasErrors: errors.length > 0,
  };
};

/**
 * Validates a single row of data
 * @param {Object} data - Row data
 * @param {number} rowNumber - Row number for error reporting
 * @returns {Array} Array of error objects
 */
const validateRow = (data, rowNumber) => {
  const errors = [];

  // Validate name
  if (!data.name || String(data.name).trim() === '') {
    errors.push({ row: rowNumber, field: 'name', error: 'Name is required' });
  }

  // Validate stock_quantity
  const stockQty = parseFloat(data.stock_quantity);
  if (isNaN(stockQty) || stockQty < 0 || !Number.isInteger(stockQty)) {
    errors.push({ row: rowNumber, field: 'stock_quantity', error: 'Stock quantity must be a non-negative integer' });
  }

  // Validate sell_price
  const sellPrice = parseFloat(data.sell_price);
  if (isNaN(sellPrice) || sellPrice < 0) {
    errors.push({ row: rowNumber, field: 'sell_price', error: 'Sell price must be a non-negative number' });
  }

  // Validate cost_price
  const costPrice = parseFloat(data.cost_price);
  if (isNaN(costPrice) || costPrice < 0) {
    errors.push({ row: rowNumber, field: 'cost_price', error: 'Cost price must be a non-negative number' });
  }

  // Validate low_stock_threshold if provided
  if (data.low_stock_threshold !== undefined && data.low_stock_threshold !== null && data.low_stock_threshold !== '') {
    const threshold = parseFloat(data.low_stock_threshold);
    if (isNaN(threshold) || threshold < 0 || !Number.isInteger(threshold)) {
      errors.push({ row: rowNumber, field: 'low_stock_threshold', error: 'Low stock threshold must be a non-negative integer' });
    }
  }

  return errors;
};

/**
 * Transforms parsed row data into inventory item format
 * @param {Object} rowData - Parsed row data
 * @param {string} userId - User UUID
 * @param {Object} categoryMap - Map of category names to IDs
 * @returns {Object} Inventory item data ready for creation
 */
export const transformRowToItem = (rowData, userId, categoryMap = {}) => {
  const data = rowData.data;
  
  const item = {
    user_id: userId,
    name: String(data.name).trim(),
    stock_quantity: parseInt(data.stock_quantity, 10),
    sell_price: parseFloat(data.sell_price),
    cost_price: parseFloat(data.cost_price),
    auto_index: !data.sku_id || String(data.sku_id).trim() === '',
    description: data.description ? String(data.description).trim() : null,
    low_stock_threshold: data.low_stock_threshold ? parseInt(data.low_stock_threshold, 10) : 10,
  };

  // Set SKU if provided
  if (data.sku_id && String(data.sku_id).trim() !== '') {
    item.sku_id = String(data.sku_id).trim();
    item.auto_index = false;
  }

  // Set category if provided and exists
  if (data.category && categoryMap[data.category.toLowerCase()]) {
    item.category_id = categoryMap[data.category.toLowerCase()];
  }

  return item;
};

/**
 * Generates a sample spreadsheet template
 * @param {string} filePath - Path to save the template
 */
export const generateTemplate = (filePath) => {
  const headers = ['name', 'stock_quantity', 'sell_price', 'cost_price', 'sku_id', 'category', 'description', 'low_stock_threshold'];
  const sampleData = [
    ['iPhone 15 Pro', 50, 999.99, 750.00, '', 'Electronics', 'Latest iPhone model', 5],
    ['Samsung Galaxy S24', 30, 899.99, 650.00, 'SAMSUNG-S24-001', 'Electronics', 'Samsung flagship phone', 10],
    ['MacBook Pro 14"', 20, 1999.99, 1500.00, '', 'Computers', 'Apple laptop', 3],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
  XLSX.writeFile(workbook, filePath);
};

export default {
  parseSpreadsheet,
  transformRowToItem,
  generateTemplate,
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
};
