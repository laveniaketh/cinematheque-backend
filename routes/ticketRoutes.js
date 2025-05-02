import express from "express";
import { buyTicket } from "../controllers/ticketController.js";

const router = express.Router();

// POST /api/tickets/buy
router.post("/buy", buyTicket);

export default router;
