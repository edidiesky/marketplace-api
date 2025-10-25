import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "./utils/logger";
import User from "./models/User";
import { testUserData, userData } from "./data";
dotenv.config();

const mongoUrl = process.env.DATABASE_URL;
if (!mongoUrl) {
  throw new Error("MongoDB connection string is not defined.");
}

mongoose.connect(mongoUrl);

mongoose.connection.on("error", (error) =>
  logger.error("MongoDB connection error:", error)
);

const importData = async () => {
  try {
    // Prisma to insert our user data
    let insertedCount = 0;
    for (let i = 0; i < testUserData.length; i += 10) {
      const result = await User.insertMany(testUserData?.slice(i, i + 10), {
        ordered: false,
      });
      insertedCount += result.length;
    }
    logger.info("Mock User Data Imported!", {
      insertedCount,
    });
    process.exit(0);
  } catch (error) {
    logger.error("Error importing data:", error);
    process.exit(1);
  }
};

importData();
