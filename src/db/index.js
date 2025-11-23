import mongoose from "mongoose";
import {DB_NAME} from "../constant.js";

const connectDB = async () => {

    const uri = process.env.MONGO_DB_URI;

    try {
        const connectInstanse =await mongoose.connect(`${uri}/${DB_NAME}`)
        // MongoDB connected successfully
    } catch (error) {
        // Error connecting to MongoDB
        process.exit(1);
    }
}


export default connectDB;