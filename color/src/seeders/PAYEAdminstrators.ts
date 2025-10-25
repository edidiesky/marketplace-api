import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../utils/logger";
import User from "../models/User";
import bcrypt from "bcryptjs";
import { generateUniquePassword } from "../utils/generatePassword";
import { PAYEData } from "./TaxPayer";

dotenv.config();

const mongoUrl = process.env.DATABASE_URL;
if (!mongoUrl) throw new Error("MongoDB connection string is not defined.");

mongoose.connect(mongoUrl);

mongoose.connection.on("error", (error) =>
  logger.error("MongoDB connection error:", error)
);


async function addPAYERoles() {
  try {
    const payeUsers: any[] = [];
    for (const paye of PAYEData) {
      const password = generateUniquePassword();
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);
      const userData = {
        ...paye,
        firstName: "PAYE",
        lastName: paye.payeRole,
        passwordHash,
        authOptions: "APP",
        lga: "Uyo",
        state: "Akwa Ibom",
        address: `123 ${"mda"
          .replace(/ & /g, " ")
          .replace(/ /g, "-")} Lane, Uyo`,
      };
      payeUsers.push(userData);

      logger.info(
        `Paye User Added , Email: ${
          userData.email
        }, Password: ${password}, , Paye: ${"mda"}`
      );
    }

    await User.insertMany(payeUsers);
    logger.info("Additional Paye roles added successfully!");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error("Error adding Paye roles:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

addPAYERoles();
