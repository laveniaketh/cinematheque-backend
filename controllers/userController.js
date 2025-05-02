import { getDB } from "../db/connection.js";

export const loginAdmin = async (req, res, next) => {
  console.log("DEBUG req.body:", req.body);
  const { username, password } = req.body;

  try {
    const db = getDB();
    const user = await db.collection("accounts").findOne({ username });

    if (!user) {
      const error = new Error("user not found");
      error.status = 404;
      return next(error);
    }

    // Optional: Add role check (e.g., admin only)
    if (user.role !== "admin") {
      const error = new Error("Unauthorized access");
      error.status = 403;
      return next(error);
    }

    if (user.password !== password) {
      const error = new Error("Incorrect password");
      error.status = 401;
      return next(error);
    }

    // Hide password in response
    const { password: _, ...safeUser } = user;

    res.status(200).json({
      msg: "Login successful",
      user: safeUser,
    });
  } catch (err) {
    next(err);
  }
};
