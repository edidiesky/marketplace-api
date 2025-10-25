import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../utils/logger";
import User, { UserType } from "../models/User";
import bcrypt from "bcryptjs";
import { generateUniquePassword } from "../utils/generatePassword";
import { AdminAdminstrators, SuperAdminData } from "./TaxPayer";

dotenv.config();

const mongoUrl = process.env.DATABASE_URL;
if (!mongoUrl) throw new Error("MongoDB connection string is not defined.");

mongoose.connect(mongoUrl);

mongoose.connection.on("error", (error) =>
  logger.error("MongoDB connection error:", error)
);

async function addAdminAdminstrators() {
  try {
    const AdminAdminstratorsData: any[] = [];
    for (const SuperAdmin of AdminAdminstrators) {
      const password = generateUniquePassword();
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);
      const userData = {
        ...SuperAdmin,
        firstName: SuperAdmin.firstName,
        lastName: SuperAdmin.lastName,
        passwordHash,
        authOptions: "APP",
        lga: "Uyo",
        state: "Akwa Ibom",
        address: `123 ${"mda"
          .replace(/ & /g, " ")
          .replace(/ /g, "-")} Lane, Uyo`,
      };
      AdminAdminstratorsData.push(userData);

      logger.info(
        `SuperAdmin User Added, Email: ${
          userData.email
        }, Password: ${password}, , SuperAdmin: ${"mda"}`
      );
    }

    await User.insertMany(AdminAdminstratorsData);
    logger.info("Additional SuperAdmin roles added successfully!");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error("Error adding SuperAdmin roles:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

addAdminAdminstrators();
