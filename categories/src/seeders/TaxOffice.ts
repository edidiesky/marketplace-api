import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import { taxOfficesList } from "../data/TaxOffices";
import logger from "../utils/logger";
import TaxStation from "../models/TaxOffices";
import MDAs from "../models/MDAs";
import { connectMongoDB } from "../utils/connectDB";
const mongoUrl = process.env.DATABASE_URL;

async function migrateTaxStations() {
  if (!mongoUrl) {
    throw new Error("MongoDB connection string is not defined.");
  }
  try {
    await connectMongoDB(mongoUrl);
    const taxStations = taxOfficesList.map((office) => ({
      name: office.value,
      location: office.value,
      mdaId: "68964e16ebb25d014b1553af",
      lga: office.value.split(" ")[0],
    }));
    await TaxStation.insertMany(taxStations);

    logger.info("TaxStation Data inserted succesfully:");
    process.exit(0);
  } catch (error) {
    logger.error("Error migrating MDA", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

migrateTaxStations();
