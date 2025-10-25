import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../utils/logger";
import User from "../models/User";
import bcrypt from "bcryptjs";
import { generateUniquePassword } from "../utils/generatePassword";
import { MDASData } from "./TaxPayer";
import { connectMongoDB } from "../utils/connectDB";

dotenv.config();

const mongoUrl = process.env.DATABASE_URL;
async function addMDARoles() {
  if (!mongoUrl) {
  throw new Error("MongoDB connection string is not defined.");
}
  try {
    await connectMongoDB(mongoUrl);
    const mdaUsers: any[] = [];
    for (const MDA of MDASData) {
      const password = generateUniquePassword();
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);

      const userData = {
        ...MDA,
        firstName: "MDA",
        lastName: MDA.mdaRole,
        passwordHash,
        authOptions: "APP",
        lga: "Uyo",
        state: "Akwa Ibom",
        address: `123 ${"mda"
          .replace(/ & /g, " ")
          .replace(/ /g, "-")} Lane, Uyo`,
      };
      mdaUsers.push(userData);

      logger.info(
        `MDA User Added , Email: ${
          userData.email
        }, Password: ${password}, , MDA: ${"mda"}`
      );
    }

    await User.insertMany(mdaUsers);
    logger.info("Additional MDA roles added successfully!");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error("Error adding MDA roles:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

addMDARoles();
