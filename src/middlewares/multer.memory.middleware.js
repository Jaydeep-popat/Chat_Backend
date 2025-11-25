import multer from "multer";
import path from "path";
import { apiError } from "../utils/apiError.js";

// Use memory storage instead of disk storage for cloud platforms
const storage = multer.memoryStorage();

// File filter for security
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedVideoTypes = /mp4|avi|mov|wmv|flv|webm/;
  const allowedDocTypes = /pdf|doc|docx|txt|rtf/;
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();
  
  // Check file extension and mime type
  const isValidImage = allowedImageTypes.test(fileExtension) && mimeType.startsWith('image/');
  const isValidVideo = allowedVideoTypes.test(fileExtension) && mimeType.startsWith('video/');
  const isValidDoc = allowedDocTypes.test(fileExtension) && (
    mimeType.startsWith('application/') || 
    mimeType.startsWith('text/')
  );
  
  if (isValidImage || isValidVideo || isValidDoc) {
    cb(null, true);
  } else {
    cb(new apiError(400, `File type ${fileExtension} is not allowed. Allowed types: images (jpg, png, gif, webp), videos (mp4, avi, mov, webm), documents (pdf, doc, docx, txt)`), false);
  }
};

export const uploadMemory = multer({ 
    storage,
    fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 1, // Only 1 file per request
      fieldSize: 1024 * 1024, // 1MB field size limit
    },
    onError: (err, next) => {
      console.error("Multer error:", err);
      next(new apiError(400, "File upload error: " + err.message));
    }
});