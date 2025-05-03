const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");
const { protect, isAdmin, isRestaurantOwner } = require("../middleware/authMiddleware");

// Public routes
router.get("/getRestaurant", restaurantController.getRestaurants);
router.get("/:id", restaurantController.getRestaurantById);

// Restaurant owner routes
router.post("/createRestaurant", protect, isRestaurantOwner, restaurantController.createRestaurant);
router.put("/:id", protect, restaurantController.updateRestaurant); 

// Admin routes
router.delete("/:id", protect, isAdmin, restaurantController.deleteRestaurant);

module.exports = router;