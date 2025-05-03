const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const ratingController = require("../controllers/ratingController");

router.post("/", protect, ratingController.submitRating);
router.get("/getRestaurantRatings", protect, ratingController.getRestaurantRatings);
router.get("/getUserRatings", protect, ratingController.getUserRatings);
router.put("/updateRating", protect, ratingController.updateRating);
router.delete("/deleteRating", protect, ratingController.deleteRating);


module.exports = router;
