import { getDB } from "../db/connection.js";

export const getDashboardStats = async (req, res, next) => {
  try {
    const db = getDB();

    // Step 1: Fetch all movies
    const movies = await db.collection("movies").find().toArray();

    if (movies.length === 0) {
      return res.status(200).json({
        msg: "No movies found.",
        totalSales: 0,
        totalTicketsSold: 0,
        movies: [],
      });
    }

    let totalSales = 0;
    let totalTicketsSold = 0;
    const movieStats = [];

    for (const movie of movies) {
      const movieID = movie._id;

      // Step 2: Calculate total tickets sold for the movie
      const tickets = await db
        .collection("tickets")
        .find({ movieID })
        .toArray();
      const ticketsSold = tickets.length;

      // Step 3: Calculate total sales for the movie
      const payments = await db
        .collection("payments")
        .find({ ticketID: { $in: tickets.map((ticket) => ticket.ticketID) } })
        .toArray();
      const movieSales = payments.reduce(
        (sum, payment) => sum + payment.paymentAmount,
        0
      );

      // Step 4: Calculate available seats
      const reservedSeats = await db
        .collection("reservedSeats")
        .find({ ticketID: { $in: tickets.map((ticket) => ticket.ticketID) } })
        .toArray();
      const reservedSeatNumbers = reservedSeats.map((seat) => seat.seatNumber);

      // Assuming a fixed number of seats per movie (80 seats: A1-H10)
      const totalSeats = 80;
      const availableSeats = totalSeats - reservedSeatNumbers.length;

      // Step 5: Add stats for the movie
      movieStats.push({
        movietitle: movie.movietitle,
        totalSales: movieSales,
        posterPath: movie.posterPath,
        ticketsSold,
        availableSeats,
      });

      // Update global totals
      totalSales += movieSales;
      totalTicketsSold += ticketsSold;
    }

    res.status(200).json({
      msg: "Dashboard stats fetched successfully.",
      totalSales,
      totalTicketsSold,
      movies: movieStats,
    });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    const error = new Error(
      "An error occurred while fetching dashboard stats."
    );
    error.status = 500;
    return next(error);
  }
};
