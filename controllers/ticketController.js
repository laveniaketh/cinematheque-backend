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
