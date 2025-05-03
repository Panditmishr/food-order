const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const {  protect, isRestaurantOwner, isDeliveryPartner } = require("../middleware/authMiddleware");

// Customer routes
router.post("/createOrder", protect, orderController.createOrder);
router.get("/", protect, orderController.getUserOrders);
router.put("/:id/rate", protect, orderController.rateOrder);

// Restaurant owner routes
router.get("/restaurant/:id", protect, orderController.getRestaurantOrders); // Authorization check is in controller
router.put("/:id/assign-delivery", protect, orderController.assignDeliveryPartner); // Authorization check is in controller

// Delivery partner routes
router.get("/delivery", protect, isDeliveryPartner, orderController.getDeliveryOrders);
router.get("/available-for-delivery", protect, isDeliveryPartner, orderController.getAvailableOrders);
router.put("/:id/accept-delivery", protect, isDeliveryPartner, orderController.acceptOrderDelivery);

// Common routes
router.get("/:id", protect, orderController.getOrderById); // Authorization check is in controller
router.put("/:id/status", protect, orderController.updateOrderStatus); // Authorization check is in controller

module.exports = router;