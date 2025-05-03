const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect, isAdmin} = require("../middleware/authMiddleware");

// Public routes
router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);

// Protected routes - require authentication
router.get("/getProfile", protect, userController.getUserProfile);
router.put("/updateProfile", protect, userController.updateUserProfile);
router.post("/addresses", protect, userController.addUserAddress);

// Admin routes
router.get("/", protect, isAdmin, userController.getUsers);

module.exports = router;