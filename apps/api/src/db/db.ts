import mongoose from "mongoose";
import { env } from "../config/env.js";

const MONGODB_URI = env.CODETECTOR_DB;

const connectDB = async () => {
    try {
        if (!MONGODB_URI) {
            throw new Error("CODETECTOR_DB environment variable is not set");
        }
        await mongoose.connect(MONGODB_URI);
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
};

export default connectDB;