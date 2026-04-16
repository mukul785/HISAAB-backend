import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Ensure upload directories exist
const UPLOAD_DIR = 'uploads';
const SPREADSHEET_DIR = path.join(UPLOAD_DIR, 'temp');
const IMAGE_DIR = path.join(UPLOAD_DIR, 'images', 'inventory');

[UPLOAD_DIR, SPREADSHEET_DIR, IMAGE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Multer storage configuration for spreadsheet uploads
 */
const spreadsheetStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, SPREADSHEET_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

/**
 * Multer storage configuration for image uploads
 */
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, IMAGE_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${req.params.id || uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

/**
 * File filter for spreadsheet uploads (Excel and CSV)
 */
const spreadsheetFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/csv',
  ];
  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'), false);
  }
};

/**
 * File filter for image uploads
 */
const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.'), false);
  }
};

/**
 * Multer middleware for spreadsheet uploads
 * Max file size: 10MB
 */
export const uploadSpreadsheet = multer({
  storage: spreadsheetStorage,
  fileFilter: spreadsheetFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
}).single('file');

/**
 * Multer middleware for image uploads
 * Max file size: 5MB
 */
export const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single('image');

/**
 * Error handling middleware for multer
 */
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

/**
 * Deletes a file from the filesystem
 * @param {string} filePath - Path to the file to delete
 */
export const deleteFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

/**
 * Deletes old temporary files (cleanup utility)
 * @param {number} maxAgeMs - Maximum age in milliseconds (default: 1 hour)
 */
export const cleanupTempFiles = (maxAgeMs = 60 * 60 * 1000) => {
  const now = Date.now();
  
  fs.readdirSync(SPREADSHEET_DIR).forEach(file => {
    const filePath = path.join(SPREADSHEET_DIR, file);
    const stats = fs.statSync(filePath);
    
    if (now - stats.mtimeMs > maxAgeMs) {
      fs.unlinkSync(filePath);
    }
  });
};

export default {
  uploadSpreadsheet,
  uploadImage,
  handleUploadError,
  deleteFile,
  cleanupTempFiles,
  SPREADSHEET_DIR,
  IMAGE_DIR,
};
