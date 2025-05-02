import { getDB } from "../db/connection.js";
import path from "path";
import fs from "fs";

export const uploadMovie = async (req, res, next) => {
  const { movietitle, releasedYear, director, timeslot, summary } = req.body;

  const poster = req.files["poster"]?.[0];
  const preview = req.files["preview"]?.[0];

  if (!poster || !preview) {
    const error = new Error("Poster and preview images are required.");
    error.status = 400;
    return next(error);
  } else if (
    !movietitle ||
    !releasedYear ||
    !director ||
    !timeslot ||
    !summary
  ) {
    const error = new Error("All fields are required.");
    error.status = 400;
    return next(error);
  }

  try {
    const db = getDB();
    const result = await db.collection("movies").insertOne({
      movietitle,
      releasedYear,
      director,
      timeslot,
      summary,
      posterPath: `/uploads/${poster.filename}`,
      previewPath: `/uploads/${preview.filename}`,
      createdAt: new Date(),
    });

    res.status(201).json({
      msg: "Movie uploaded successfully.",
      movieId: result.insertedId,
    });
  } catch (err) {
    const error = new Error("An error occurred while uploading the movie.");
    error.status = 500;
    return next(error);
  }
};

// Get all movie titles
export const getAllMovieTitles = async (req, res, next) => {
  try {
    const db = getDB();
    const movies = await db
      .collection("movies")
      .find({}, { projection: { movietitle: 1 } })
      .toArray();

    res.status(200).json({
      msg: "Movie titles fetched successfully.",
      titles: movies.map((movie) => movie.movietitle),
    });
  } catch (err) {
    const error = new Error("An error occurred while fetching movie titles.");
    error.status = 500;
    return next(error);
  }
};

// Get movie details by title
export const getMovieDetails = async (req, res, next) => {
  const { movietitle } = req.params;

  try {
    const db = getDB();
    const movie = await db.collection("movies").findOne({ movietitle });

    if (!movie) {
      const error = new Error("Select current movie");
      error.status = 404;
      return next(error);
    }

    res.status(200).json({
      msg: "Movie details fetched successfully.",
      movie,
    });
  } catch (err) {
    const error = new Error("An error occurred while fetching movie details.");
    error.status = 500;
    return next(error);
  }
};

export const deleteMovie = async (req, res, next) => {
  const { movietitle } = req.params;

  try {
    const db = getDB();
    const result = await db.collection("movies").deleteOne({ movietitle });

    if (result.deletedCount === 0) {
      const error = new Error("Movie not found.");
      error.status = 404;
      return next(error);
    }

    res.status(200).json({
      msg: "Movie deleted successfully.",
    });
  } catch (err) {
    const error = new Error("An error occurred while deleting the movie.");
    error.status = 500;
    return next(error);
  }
};

// Delete all movies
export const deleteAllMovies = async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.collection("movies").deleteMany({});

    if (result.deletedCount === 0) {
      const error = new Error("No movies found to delete.");
      error.status = 404;
      return next(error);
    }

    res.status(200).json({
      msg: "All movies deleted successfully.",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    const error = new Error("An error occurred while deleting all movies.");
    error.status = 500;
    return next(error);
  }
};

//  Update movie details by title
export const updateMovieDetail = async (req, res, next) => {
  const { movietitle } = req.params;
  const updateData = req.body;

  // Check if new poster or preview images are uploaded
  const poster = req.files?.["poster"]?.[0];
  const preview = req.files?.["preview"]?.[0];

  if (poster) {
    updateData.posterPath = `/uploads/${poster.filename}`;
  }
  if (preview) {
    updateData.previewPath = `/uploads/${preview.filename}`;
  }

  // Check if any field in updateData is empty
  for (const [key, value] of Object.entries(updateData)) {
    if (!value || value.trim() === "") {
      const error = new Error(`Field "${key}" cannot be empty.`);
      error.status = 400;
      return next(error);
    }
  }

  try {
    const db = getDB();
    const result = await db
      .collection("movies")
      .updateOne({ movietitle }, { $set: updateData });

    if (result.matchedCount === 0) {
      const error = new Error("Movie not found.");
      error.status = 404;
      return next(error);
    }

    res.status(200).json({
      msg: "Movie details updated successfully.",
      updatedCount: result.modifiedCount,
    });
  } catch (err) {
    const error = new Error(
      "An error occurred while updating the movie details."
    );
    error.status = 500;
    return next(error);
  }
};

export const getMovieIDByTitle = async (req, res, next) => {
  const { movietitle } = req.params;

  try {
    const db = getDB();
    const movie = await db.collection("movies").findOne({ movietitle });

    if (!movie) {
      const error = new Error("Movie not found.");
      error.status = 404;
      return next(error);
    }

    res.status(200).json({
      msg: "Movie ID fetched successfully.",
      movieID: movie._id,
    });
  } catch (err) {
    const error = new Error("An error occurred while fetching the movie ID.");
    error.status = 500;
    return next(error);
  }
};

export const getAllReservedSeats = async (req, res, next) => {
  const { movietitle } = req.params;

  try {
    const db = getDB();

    // Step 1: Find the movieID by movietitle
    const movie = await db.collection("movies").findOne({ movietitle });
    if (!movie) {
      const error = new Error("Movie not found.");
      error.status = 404;
      return next(error);
    }

    const movieID = movie._id;

    // Step 2: Find all tickets for the movie
    const tickets = await db.collection("tickets").find({ movieID }).toArray();

    if (tickets.length === 0) {
      return res.status(200).json({
        msg: "No reserved seats found for this movie.",
        reservedSeats: [],
      });
    }

    // Step 3: Find all reserved seats for the tickets
    const ticketIDs = tickets.map((ticket) => ticket.ticketID);
    const reservedSeats = await db
      .collection("reservedSeats")
      .find({ ticketID: { $in: ticketIDs } })
      .toArray();

    // Extract seat numbers
    const seatNumbers = reservedSeats.map((seat) => seat.seatNumber);

    res.status(200).json({
      msg: "Reserved seats fetched successfully.",
      reservedSeats: seatNumbers,
    });
  } catch (err) {
    console.error("Error fetching reserved seats:", err);
    const error = new Error("An error occurred while fetching reserved seats.");
    error.status = 500;
    return next(error);
  }
};
