import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.ATLAS_URI;

if (!uri) {
  throw new Error("MongoDB connection string is missing in .env file!");
}

const client = new MongoClient(uri); // <- cleaned up here

let db;

const connectDB = async () => {
  try {
    await client.connect();
    db = client.db("cinematheque");
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
};

const getDB = () => {
  if (!db) throw new Error("Database not connected. Call connectDB() first.");
  return db;
};

export { connectDB, getDB };
