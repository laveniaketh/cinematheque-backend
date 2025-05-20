import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { connectDB } from "./db/connection.js";
import userRoutes from "./routes/userRoutes.js";
import movieRoutes from "./routes/movieRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

import logger from "./middleware/logger.js";
import errorHandler from "./middleware/error.js";
import notFound from "./middleware/notFound.js";

dotenv.config();

const port = process.env.PORT || 8000;
const app = express();
app.use(cors());

// Body Parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(logger);

// Serve static files (for uploaded images)
app.use("/uploads", express.static("public/uploads")); // 👈 Serve uploaded images

// Connect to MongoDB
await connectDB();

// Routes
app.use("/api", userRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Error Handler
app.use(notFound);
app.use(errorHandler);

app.listen(port, () => console.log(`Server is running on port ${port}`));
