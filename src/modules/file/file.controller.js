const fileService = require('./file.service');
const { AppError } = require('../../middleware/errorHandler');
const { fromBuffer } = require('file-type');
const path = require('path');

// Allowed MIME types for MVP
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'application/zip',
  'application/x-rar-compressed',
  'text/plain',
  'application/json',
  'text/csv'
];

/**
 * Upload files
 */
async function uploadFiles(req, res) {
  if (!req.files || req.files.length === 0) {
    throw new AppError('Fayl tanlanmagan', 400);
  }

  const uploadedFileIds = [];

  for (const file of req.files) {
    // 1. Extension validation (Block .exe, .sh, .bat etc.)
    const ext = path.extname(file.originalname).toLowerCase();
    const FORBIDDEN_EXTS = ['.exe', '.sh', '.bat', '.js', '.php', '.py'];
    if (FORBIDDEN_EXTS.includes(ext)) {
      throw new AppError(`Ushbu kengaytmali faylni yuklash taqiqlangan: ${ext}`, 400);
    }

    // 2. Magic bytes validation to prevent MIME spoofing
    const typeInfo = await fromBuffer(file.buffer);
    let mimeType = typeInfo ? typeInfo.mime : null;

    // Handle plain text files which do not have magic bytes signatures
    if (!typeInfo) {
      const SAFE_TEXT_EXTS = ['.txt', '.sql', '.json', '.csv', '.md'];
      if (SAFE_TEXT_EXTS.includes(ext)) {
        if (ext === '.json') mimeType = 'application/json';
        else if (ext === '.csv') mimeType = 'text/csv';
        else mimeType = 'text/plain';
      }
    }

    // If we can't determine the type, or it's not in our allowed list, reject
    if (!mimeType || !ALLOWED_TYPES.includes(mimeType)) {
      throw new AppError(`Fayl turi ruxsat etilmagan: ${file.originalname}`, 400);
    }

    const fileId = await fileService.uploadFileToTelegram(
      file.buffer,
      file.originalname,
      mimeType
    );
    
    uploadedFileIds.push(fileId);
  }

  res.status(201).json({
    success: true,
    message: 'Fayllar muvaffaqiyatli yuklandi',
    data: {
      fileIds: uploadedFileIds
    }
  });
}

/**
 * Get file download URL
 */
async function getFileUrl(req, res) {
  const { fileId } = req.params;
  
  if (!fileId) {
    throw new AppError('fileId ko\'rsatilmagan', 400);
  }

  const url = await fileService.getFileUrl(fileId);
  
  res.json({
    success: true,
    data: { url }
  });
}

module.exports = {
  uploadFiles,
  getFileUrl
};
