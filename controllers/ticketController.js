import { getDB } from "../db/connection.js";
import { ObjectId } from "mongodb";

export const buyTicket = async (req, res, next) => {
  const { movieID, seatNumbers, paymentAmount } = req.body;

  // Validate input
  if (
    !movieID ||
    !Array.isArray(seatNumbers) ||
    seatNumbers.length === 0 ||
    !seatNumbers.every((seat) => /^[A-H][1-9]$|^[A-H]10$/.test(seat)) || // Validate seat format
    typeof paymentAmount !== "number" ||
    paymentAmount <= 0
  ) {
    const error = new Error(
      "Movie ID, valid seat numbers (e.g., A1, B5), and a positive payment amount are required."
    );
    error.status = 400;
    return next(error);
  }

  try {
    const db = getDB();

    // Check if the movie exists
    const movie = await db
      .collection("movies")
      .findOne({ _id: new ObjectId(movieID) });
    if (!movie) {
      const error = new Error("Movie not found.");
      error.status = 404;
      return next(error);
    }

    const counter = await db
      .collection("counters")
      .findOneAndUpdate(
        { _id: "ticketID" },
        { $inc: { sequence_value: 1 } },
        { upsert: true, returnDocument: "after" }
      );

    // Access the updated document
    const updatedCounter = counter.value || counter; // Handle both cases

    // Ensure the counter document exists and has a valid sequence_value
    if (!updatedCounter || typeof updatedCounter.sequence_value !== "number") {
      console.error("Counter document is invalid or missing:", updatedCounter);
      const error = new Error("Failed to generate a unique ticket ID.");
      error.status = 500;
      return next(error);
    }

    const ticketID = updatedCounter.sequence_value.toString().padStart(6, "0");

    // Create a new ticket
    await db.collection("tickets").insertOne({
      ticketID,
      movieID: new ObjectId(movieID),
      createdAt: new Date(),
      ticketStatus: "Pending",
    });

    // Reserve the seats
    const seatReservations = seatNumbers.map((seatNumber) => ({
      ticketID,
      seatNumber,
    }));
    await db.collection("reservedSeats").insertMany(seatReservations);

    // Record the payment
    await db.collection("payments").insertOne({
      ticketID,
      paymentAmount,
    });

    // Update ticket status to "Pending"
    await db
      .collection("tickets")
      .updateOne({ ticketID }, { $set: { ticketStatus: "Pending" } });

    res.status(201).json({
      msg: "Ticket purchased successfully.",
      ticketID,
      reservedSeats: seatNumbers,
      paymentAmount,
      movieTitle: movie.title,
      timeslot: movie.timeslot,
    });
  } catch (err) {
    console.error("Error processing ticket:", err); // Log the error
    const error = new Error("An error occurred while processing the ticket.");
    error.status = 500;
    return next(error);
  }
};

export const getAllTickets = async (req, res, next) => {
  try {
    const db = getDB();

    // Fetch all tickets, sorted from latest to oldest
    const tickets = await db
      .collection("tickets")
      .find()
      .sort({ createdAt: -1 }) // Sort by createdAt descending
      .toArray();

    if (tickets.length === 0) {
      return res.status(200).json({
        msg: "No tickets found.",
        tickets: [],
        totalTickets: 0,
      });
    }

    const ticketDetails = [];

    for (const ticket of tickets) {
      const ticketID = ticket.ticketID;

      // Fetch paymentAmount for the ticket
      const payment = await db.collection("payments").findOne({ ticketID });
      const paymentAmount = payment ? payment.paymentAmount : 0;

      // Fetch seatNumbers for the ticket
      const reservedSeats = await db
        .collection("reservedSeats")
        .find({ ticketID })
        .toArray();
      const seatNumbers = reservedSeats.map((seat) => seat.seatNumber);

      // Fetch movietitle using movieID
      const movie = await db
        .collection("movies")
        .findOne({ _id: new ObjectId(ticket.movieID) });
      const movietitle = movie ? movie.movietitle : "Unknown Movie";

      // Add ticket details
      ticketDetails.push({
        ticketID,
        movietitle,
        createdAt: ticket.createdAt,
        ticketStatus: ticket.ticketStatus,
        paymentAmount,
        seatNumbers,
      });
    }

    res.status(200).json({
      msg: "Tickets fetched successfully.",
      tickets: ticketDetails,
      totalTickets: ticketDetails.length,
    });
  } catch (err) {
    console.error("Error fetching tickets:", err);
    const error = new Error("An error occurred while fetching tickets.");
    error.status = 500;
    return next(error);
  }
};

export const updateTicketStatus = async (req, res, next) => {
  const { ticketID } = req.params;
  const { ticketStatus } = req.body;

  if (!["Pending", "Paid", "Cancelled", "Expired"].includes(ticketStatus)) {
    return res.status(400).json({ msg: "Invalid ticket status." });
  }

  try {
    const db = getDB();
    const result = await db
      .collection("tickets")
      .updateOne({ ticketID }, { $set: { ticketStatus } });

    if (result.matchedCount === 0) {
      return res.status(404).json({ msg: "Ticket not found." });
    }

    res.status(200).json({ msg: "Ticket status updated successfully." });
  } catch (err) {
    console.error("Error updating ticket status:", err);
    res
      .status(500)
      .json({ msg: "An error occurred while updating ticket status." });
  }
};

export const searchTickets = async (req, res, next) => {
  try {
    const db = getDB();
    const { q } = req.query;
    if (!q || q.trim() === "") {
      return res.status(400).json({ msg: "Search query is required." });
    }

    const query = q.trim();

    // Find tickets by ticketID (exact), or by movietitle (partial, case-insensitive)
    // or by seatNumber (partial, case-insensitive)
    // 1. Find tickets by ticketID or movietitle
    const movieMatches = await db
      .collection("movies")
      .find({ movietitle: { $regex: query, $options: "i" } })
      .toArray();
    const movieIDs = movieMatches.map((m) => m._id);

    // 2. Find ticketIDs by seatNumber
    const reservedMatches = await db
      .collection("reservedSeats")
      .find({ seatNumber: { $regex: query, $options: "i" } })
      .toArray();
    const ticketIDsBySeat = reservedMatches.map((r) => r.ticketID);

    // 3. Find tickets matching any of the criteria
    const tickets = await db
      .collection("tickets")
      .find({
        $or: [
          { ticketID: query }, // exact match for ticketID
          { movieID: { $in: movieIDs } },
          { ticketID: { $in: ticketIDsBySeat } },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();

    if (tickets.length === 0) {
      return res.status(200).json({
        msg: "No tickets found.",
        tickets: [],
        totalTickets: 0,
      });
    }

    // Build ticket details as in getAllTickets
    const ticketDetails = [];
    for (const ticket of tickets) {
      const ticketID = ticket.ticketID;

      // Payment
      const payment = await db.collection("payments").findOne({ ticketID });
      const paymentAmount = payment ? payment.paymentAmount : 0;

      // Seats
      const reservedSeats = await db
        .collection("reservedSeats")
        .find({ ticketID })
        .toArray();
      const seatNumbers = reservedSeats.map((seat) => seat.seatNumber);

      // Movie title
      const movie = await db
        .collection("movies")
        .findOne({ _id: new ObjectId(ticket.movieID) });
      const movietitle = movie ? movie.movietitle : "Unknown Movie";

      ticketDetails.push({
        ticketID,
        movietitle,
        createdAt: ticket.createdAt,
        ticketStatus: ticket.ticketStatus,
        paymentAmount,
        seatNumbers,
      });
    }

    res.status(200).json({
      msg: "Tickets fetched successfully.",
      tickets: ticketDetails,
      totalTickets: ticketDetails.length,
    });
  } catch (err) {
    console.error("Error searching tickets:", err);
    const error = new Error("An error occurred while searching tickets.");
    error.status = 500;
    return next(error);
  }
};
