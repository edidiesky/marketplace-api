import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../utils/logger";
import User from "../models/User";
import bcrypt from "bcryptjs";
import { getSingleTINFromPool } from "../utils/generateTIN";
import { generateUniquePassword } from "../utils/generatePassword";
import { AKS_MDAIs } from "../data/Mdas";
import { connectMongoDB } from "../utils/connectDB";
import { CHUNK_SIZE } from "../constants";

dotenv.config();

async function migrateStateAgencies() {
  const mongoUrl = process.env.DATABASE_URL;
  if (!mongoUrl) {
    throw new Error("MongoDB connection string is not defined.");
  }
  try {
    await connectMongoDB(mongoUrl);
    const mdaUsers: any[] = [];
    for (const mdaName of AKS_MDAIs) {
      const tin = await getSingleTINFromPool("MDA");
      const password = generateUniquePassword();
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);

      const userData = {
        tin,
        agencyName: mdaName,
        email: `myketefia@gmail.com`,
        phone: `08033917889`,
        secondaryPhone: `08033917889`,
        passwordHash,
        authOptions: "APP",
        lga: "Uyo",
        state: "Akwa Ibom",
        address: `123 ${mdaName
          .replace(/ & /g, " ")
          .replace(/ /g, "-")} Lane, Uyo`,
        jurisdiction: "Akwa Ibom",
        userType: "STATE",
      };
      mdaUsers.push(userData);
      logger.info(
        `MDA User Migrated - TIN: ${tin}, Email: ${userData.email}, Password: ${password}, MDA: ${mdaName}`
      );
    }

    let insertedCount = 0;
    for (let i = 0; i < mdaUsers?.length; i += CHUNK_SIZE) {
      const userInsertedValue = await User.insertMany(
        mdaUsers?.slice(i, i + CHUNK_SIZE)
      );
      insertedCount += userInsertedValue?.length;
    }
    logger.info("Mock State Agencies Data Imported!", {
      insertedCount,
    });
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error("Error migrating MDA data:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

migrateStateAgencies();
