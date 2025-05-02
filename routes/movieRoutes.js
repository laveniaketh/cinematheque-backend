import express from "express";
import multer from "multer";
import path from "path";
import {
  uploadMovie,
  getAllMovieTitles,
  getMovieDetails,
  deleteMovie,
  deleteAllMovies,
  updateMovieDetail,
  getMovieIDByTitle,
  getAllReservedSeats,
} from "../controllers/movieController.js";

const router = express.Router();

// Setup Multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  },
});

const upload = multer({ storage });

// POST /api/movies/upload
router.post(
  "/upload",
  upload.fields([
    { name: "poster", maxCount: 1 },
    { name: "preview", maxCount: 1 },
  ]),
  uploadMovie
);

// GET /api/movies/titles
router.get("/titles", getAllMovieTitles);

// GET /api/movies/details/:movietitle
router.get("/details/:movietitle", getMovieDetails);

// DELETE /api/movies/delete/:movietitle
router.delete("/delete/:movietitle", deleteMovie);

// DELETE /api/movies/deleteAll
router.delete("/deleteAll", deleteAllMovies);

// PUT /api/movies/update/:movietitle
router.put(
  "/update/:movietitle",
  upload.fields([
    { name: "poster", maxCount: 1 },
    { name: "preview", maxCount: 1 },
  ]),
  updateMovieDetail
);

// GET /api/movies/id/:movietitle
router.get("/id/:movietitle", getMovieIDByTitle);

// GET /api/movies/reserved-seats/:movietitle
router.get("/reserved-seats/:movietitle", getAllReservedSeats);

export default router;
