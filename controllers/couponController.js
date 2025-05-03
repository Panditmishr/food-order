
const asyncHandler = require("express-async-handler");
const Coupon = require("../models/couponModel");
const User = require("../models/userModel");


const createCoupon = asyncHandler(async (req, res) => {
  const {
    code,
    description,
    discountType,
    discountValue,
    minOrderAmount,
    maxDiscountAmount,
    startDate,
    endDate,
    usageLimit,
    perUserLimit,
    applicableRestaurants,
    applicableCategories,
    excludedItems,
    firstTimeUsersOnly
  } = req.body;

  // Validate required fields
  if (!code || !description || !discountType || !discountValue || !startDate || !endDate) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  // Check if coupon code already exists
  const couponExists = await Coupon.findOne({ code: code.toUpperCase() });
  if (couponExists) {
    res.status(400);
    throw new Error("Coupon code already exists");
  }

  // Validate discount value
  if (discountType === "percentage" && (discountValue <= 0 || discountValue > 100)) {
    res.status(400);
    throw new Error("Percentage discount must be between 1 and 100");
  }

  if (discountType === "fixed" && discountValue <= 0) {
    res.status(400);
    throw new Error("Fixed discount must be greater than 0");
  }

  // Create new coupon
  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    description,
    discountType,
    discountValue,
    minOrderAmount: minOrderAmount || 0,
    maxDiscountAmount: maxDiscountAmount || undefined,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    usageLimit: usageLimit || undefined,
    perUserLimit: perUserLimit || 1,
    applicableRestaurants: applicableRestaurants || [],
    applicableCategories: applicableCategories || [],
    excludedItems: excludedItems || [],
    firstTimeUsersOnly: firstTimeUsersOnly || false
  });

  res.status(201).json(coupon);
});

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private (Admin only)
const getCoupons = asyncHandler(async (req, res) => {
  const pageSize = 20;
  const page = Number(req.query.page) || 1;

  const count = await Coupon.countDocuments({});
  
  const coupons = await Coupon.find({})
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.status(200).json({
    coupons,
    page,
    pages: Math.ceil(count / pageSize),
    total: count
  });
});

// @desc    Get active coupons for customer
// @route   GET /api/coupons/active
// @access  Private
const getActiveCoupons = asyncHandler(async (req, res) => {
  const today = new Date();
  
  // Find all active coupons
  const coupons = await Coupon.find({
    isActive: true,
    startDate: { $lte: today },
    endDate: { $gte: today },
    // If coupon has a usage limit, ensure it hasn't been reached
    $or: [
      { usageLimit: { $exists: false } },
      { usedCount: { $lt: "$usageLimit" } }
    ]
  }).select("-applicableCategories -excludedItems");

  // Filter coupons for first-time users if needed
  const filteredCoupons = coupons.filter(coupon => {
    // Check if coupon is for first-time users only
    if (coupon.firstTimeUsersOnly) {
      // Check if user has any orders (this would require order model access)
      // For simplicity, we'll just use a placeholder check here
      const isFirstTimeUser = true; // This would be replaced with actual logic
      return isFirstTimeUser;
    }
    return true;
  });

  res.status(200).json(filteredCoupons);
});

// @desc    Get coupon by ID
// @route   GET /api/coupons/:id
// @access  Private (Admin only)
const getCouponById = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }

  res.status(200).json(coupon);
});

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private (Admin only)
const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }

  // Update coupon fields
  const updatedData = { ...req.body };
  
  // If updating code, ensure to uppercase it
  if (updatedData.code) {
    updatedData.code = updatedData.code.toUpperCase();

    // Check if new code already exists (if different from current)
    if (updatedData.code !== coupon.code) {
      const codeExists = await Coupon.findOne({ code: updatedData.code });
      if (codeExists) {
        res.status(400);
        throw new Error("Coupon code already exists");
      }
    }
  }

  // Convert date strings to Date objects if provided
  if (updatedData.startDate) {
    updatedData.startDate = new Date(updatedData.startDate);
  }
  
  if (updatedData.endDate) {
    updatedData.endDate = new Date(updatedData.endDate);
  }

  // Update the coupon
  const updatedCoupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    updatedData,
    { new: true }
  );

  res.status(200).json(updatedCoupon);
});

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Private (Admin only)
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }

  await coupon.deleteOne();

  res.status(200).json({ message: "Coupon removed" });
});

// @desc    Validate coupon for a user
// @route   POST /api/coupons/validate
// @access  Private
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal, restaurantId } = req.body;

  if (!code || !subtotal) {
    res.status(400);
    throw new Error("Coupon code and order subtotal are required");
  }

  const today = new Date();
  
  // Find the coupon
  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
    isActive: true,
    startDate: { $lte: today },
    endDate: { $gte: today }
  });

  if (!coupon) {
    res.status(404);
    throw new Error("Invalid or expired coupon");
  }

  // Check minimum order amount
  if (coupon.minOrderAmount > subtotal) {
    res.status(400);
    throw new Error(`Minimum order amount of ${coupon.minOrderAmount} not met`);
  }

  // Check usage limit
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    res.status(400);
    throw new Error("Coupon usage limit reached");
  }

  // Check restaurant restrictions if applicable
  if (restaurantId && coupon.applicableRestaurants && coupon.applicableRestaurants.length > 0) {
    if (!coupon.applicableRestaurants.includes(restaurantId)) {
      res.status(400);
      throw new Error("Coupon not applicable to this restaurant");
    }
  }

  // Check if user has used this coupon before (if per user limit is set)
  // This would require tracking user's coupon usage in a separate collection
  // For simplicity, we're not implementing that in this example

  // Calculate discount
  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = subtotal * (coupon.discountValue / 100);
    
    // Apply max discount cap if set
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }
  } else {
    // Fixed discount
    discount = coupon.discountValue;
    
    // Don't allow discount to exceed order subtotal
    if (discount > subtotal) {
      discount = subtotal;
    }
  }

  res.status(200).json({
    valid: true,
    code: coupon.code,
    discount: parseFloat(discount.toFixed(2)),
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    description: coupon.description
  });
});

module.exports = {
  createCoupon,
  getCoupons,
  getActiveCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon
};