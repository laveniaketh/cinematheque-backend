import express from "express";
import { loginAdmin } from "../controllers/userController.js";

const router = express.Router();

// POST /api/admin/login
router.post("/login", loginAdmin);

// router.post("/login", (req, res) => {
//   console.log("🔍 Incoming body:", req.body);
//   res.json({ status: "ok", body: req.body });
// });

// ✅ Default export here
export default router;
