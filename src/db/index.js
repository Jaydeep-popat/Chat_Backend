import mongoose from "mongoose";
import {DB_NAME} from "../constant.js";
import { log } from "console";

const connectDB = async () => {

    const uri = process.env.MONGO_DB_URI;

    if (!uri) {
        console.error("❌ MONGO_DB_URI is not defined in environment variables");
        process.exit(1);
    }

    console.log("🔄 Attempting to connect to MongoDB...");
    console.log(`📍 Database URI: ${uri.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in logs

    try {
        const connectInstance = await mongoose.connect(`${uri}/${DB_NAME}`);
        console.log(`✅ MongoDB connected successfully to database: ${DB_NAME}`);
        console.log(`🔗 Connected to host: ${connectInstance.connection.host}`);
        console.log(`📊 Connection state: ${connectInstance.connection.readyState === 1 ? 'Connected' : 'Not Connected'}`);
    } catch (error) {
        console.error("❌ Error connecting to MongoDB:", error.message);
        console.error("🔍 Connection details - Database:", DB_NAME);
        console.error("🔍 Full error:", error);
        process.exit(1);
    }
}


export default connectDB;