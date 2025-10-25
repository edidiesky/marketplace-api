import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../utils/logger";
import User from "../models/User";
import { MDAData } from "../data/Mdas";
import bcrypt from "bcryptjs";
import { getSingleTINFromPool } from "../utils/generateTIN";
import { generateUniquePassword } from "../utils/generatePassword";

dotenv.config();

const mongoUrl = process.env.DATABASE_URL;
if (!mongoUrl) throw new Error("MongoDB connection string is not defined.");

mongoose.connect(mongoUrl);

mongoose.connection.on("error", (error) => logger.error("MongoDB connection error:", error));

async function migrateMDAData() {
  try {
    const mdaUsers: any[] = [];
    for (const [mdaName, revenueLines] of Object.entries(MDAData)) {
      
      const tin = await getSingleTINFromPool("MDA");
      const password = generateUniquePassword();
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);

      const userData = {
        userType: "MDA",
        tin,
        email: `admin-${mdaName.toLowerCase().replace(/ & /g, '.').replace(/ /g, '.')}-akirs@ibomtax.ng`.slice(0, 254),
        phone: `080${Math.floor(10000000 + Math.random() * 90000000).toString()}`.slice(0, 11),
        passwordHash,
        authOptions: "APP",
        lga: "Uyo",
        state: "Akwa Ibom",
        address: `123 ${mdaName.replace(/ & /g, ' ').replace(/ /g, '-')} Lane, Uyo`,
        revenueLines: revenueLines.map((line: string) => ({
          name: line,
          type: line.includes("FEES")
            ? "FEES"
            : line.includes("TAXES")
            ? "TAXES"
            : line.includes("LICENSES")
            ? "LICENSES"
            : line.includes("SALES")
            ? "SALES"
            : line.includes("FINES")
            ? "FINES"
            : line.includes("EARNING")
            ? "EARNINGS"
            : line.includes("RENT")
            ? "RENT"
            : "INTEREST",
        })),
        jurisdiction: "Akwa Ibom",
        mdaRole: "AGENCY",
        complianceScore: 85,
        lastComplianceCheck: new Date(),
      };
      mdaUsers.push(userData);

      // Log credentials for admin reference (store securely)
      logger.info(`MDA User Migrated - TIN: ${tin}, Email: ${userData.email}, Password: ${password}, MDA: ${mdaName}`);
    }

    await User.insertMany(mdaUsers);
    logger.info("MDA Data migrated successfully!");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error("Error migrating MDA data:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

migrateMDAData();