import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

import dotenv from 'dotenv';
dotenv.config(); // must be at the top

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {

  try {
    if (!localFilePath) {
      console.log("❌ Cloudinary upload failed: No file path provided");
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

export {uploadOnCloudinary}