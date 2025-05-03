const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const couponController = require("../controllers/couponController");

router.post("/create", protect, couponController.createCoupon);
router.get("/", protect, couponController.getCoupons);
router.get("/active", protect, couponController.getActiveCoupons); 
router.get("/:id", protect,  couponController.getCouponById);
router.put("/:id", protect,  couponController.updateCoupon);
router.delete("/:id", protect,  couponController.deleteCoupon);
router.post("/validate", protect, couponController.validateCoupon); 

module.exports = router;