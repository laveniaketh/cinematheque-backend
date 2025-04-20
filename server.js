import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { connectDB } from "./db/connection.js";
import userRoutes from "./routes/userRoutes.js";

import logger from "./middleware/logger.js";
import errorHandler from "./middleware/error.js";
import notFound from "./middleware/notFound.js";

dotenv.config();

const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors());

// app.use((req, res, next) => {
//   console.log("🧪 BEFORE express.json()");
//   next();
// });

app.use(express.json());

// app.use((req, res, next) => {
//   console.log("🧪 AFTER express.json() - req.body:", req.body);
//   next();
// });

app.use(logger);

// Connect to MongoDB
await connectDB();

// Routes
app.use("/api", userRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
