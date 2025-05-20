import express from "express";
import {
  buyTicket,
  getAllTickets,
  updateTicketStatus,
  searchTickets,
} from "../controllers/ticketController.js";

const router = express.Router();

// POST /api/tickets/buy
router.post("/buy", buyTicket);
router.get("/", getAllTickets);
router.patch("/:ticketID/status", updateTicketStatus);
router.get("/search", searchTickets);

export default router;
