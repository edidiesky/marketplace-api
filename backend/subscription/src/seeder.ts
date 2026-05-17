import dotenv from "dotenv";
import logger from "./utils/logger";
import User from "./models/User";
import { userData } from "./data";
import { connectMongoDB } from "./utils/connectDB";
dotenv.config();

const mongoUrl = process.env.DATABASE_URL;
if (!mongoUrl) {
  throw new Error("MongoDB connection string is not defined.");
}

const importData = async () => {
  await connectMongoDB(mongoUrl);
  try {
    let insertedCount = 0;
    for (let i = 0; i < userData.length; i += 10) {
      const result = await User.insertMany(userData?.slice(i, i + 10), {
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
