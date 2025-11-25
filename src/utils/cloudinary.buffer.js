import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import path from "path"

import dotenv from 'dotenv';
dotenv.config(); // must be at the top

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// Upload from local file path (existing function)
const uploadOnCloudinary = async (localFilePath) => {

  try {
    if (!localFilePath) {
      console.log("❌ Cloudinary upload failed: No file path provided");
      return null;
    }

    // Check if file exists before uploading
    if (!fs.existsSync(localFilePath)) {
      console.log(`❌ File not found: ${localFilePath}`);
      return null;
    }

    console.log(`☁️ Uploading file to Cloudinary: ${localFilePath}`);

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log(`✅ Cloudinary upload successful: ${response.public_id}`);
    console.log(`🔗 File URL: ${response.secure_url}`);

    fs.unlinkSync(localFilePath); // Clean up temp file
    console.log(`🗑️ Temporary file cleaned up: ${localFilePath}`);
    return response;
  } catch (error) {
    console.log(`❌ Cloudinary upload error: ${error.message}`);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath); // Remove temp file on error
      console.log(`🗑️ Temporary file cleaned up after error: ${localFilePath}`);
    }
    return null;
  }
};

// Upload from buffer (better for cloud platforms like Render)
const uploadBufferToCloudinary = async (buffer, filename) => {
  try {
    if (!buffer) {
      console.log("❌ Cloudinary upload failed: No buffer provided");
      return null;
    }

    console.log(`☁️ Uploading buffer to Cloudinary: ${filename}`);

    const response = await cloudinary.uploader.upload(
      `data:image/upload;base64,${buffer.toString('base64')}`,
      {
        resource_type: "auto",
        public_id: filename ? filename.split('.')[0] : undefined,
      }
    );

    console.log(`✅ Cloudinary upload successful: ${response.public_id}`);
    console.log(`🔗 File URL: ${response.secure_url}`);
    
    return response;
  } catch (error) {
    console.log(`❌ Cloudinary upload error: ${error.message}`);
    return null;
  }
};

export {uploadOnCloudinary, uploadBufferToCloudinary}