const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const cartController = require("../controllers/cartController");

router.post("/add", protect, cartController.addItemToCart);
router.put("/update", protect, cartController.updateCartItem);
router.delete("/remove", protect, cartController.removeCartItem);
router.get("/get", protect, cartController.getCart);
router.post("/apply-coupon", protect, cartController.applyCoupon);
router.delete("/remove-coupon", protect, cartController.removeCoupon);
router.delete("/clear", protect, cartController.clearCart);

module.exports = router;
