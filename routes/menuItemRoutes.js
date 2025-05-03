const express = require("express");
const router = express.Router();
const menuItemController = require("../controllers/menuItemController");
const { protect,isRestaurantOwner} = require("../middleware/authMiddleware");

// Public routes
router.get("/restaurant/:id", menuItemController.getMenuItemsByRestaurant);
router.get("/:id", menuItemController.getMenuItemById);

// Restaurant owner routes
router.post("/createMenu", protect, isRestaurantOwner, menuItemController.createMenuItem);
router.put("/:id", protect, menuItemController.updateMenuItem); // Authorization check is in controller
router.delete("/:id", protect, menuItemController.deleteMenuItem); // Authorization check is in controller

module.exports = router;