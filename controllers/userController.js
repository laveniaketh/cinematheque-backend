import { getDB } from "../db/connection.js";

export const loginAdmin = async (req, res, next) => {
  console.log("DEBUG req.body:", req.body); // Add this line
  const { username, password } = req.body;

  try {
    const db = getDB();
    const user = await db.collection("accounts").findOne({ username });

    if (!user) {
      return res.status(404).json({ msg: "Admin not found" });
    }

    // Optional: Add role check (e.g., admin only)
    if (user.role !== "admin") {
      return res.status(403).json({ msg: "Unauthorized access" });
    }

    if (user.password !== password) {
      return res.status(401).json({ msg: "Incorrect password" });
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
