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
      console.error("❌ No local file path provided");
      return null;
    }

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });


    fs.unlinkSync(localFilePath); // Clean up temp file
    return response;
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error.message);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath); // Remove temp file on error
    }
    return null;
  }
};

export {uploadOnCloudinary}