const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const paymentController = require("../controllers/paymentController");

router.post("/", protect, paymentController.createPayment);
router.get("/:id", protect, paymentController.getPaymentById);
router.get("/history", protect, paymentController.getPaymentHistory);
router.post("/refund/:id", protect, paymentController.processRefund);
router.post("/webhook", paymentController.handlePaymentWebhook);


module.exports = router;
