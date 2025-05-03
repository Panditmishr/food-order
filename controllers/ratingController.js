const asyncHandler = require("express-async-handler");
const Rating = require("../models/ratingModel");
const Order = require("../models/orderModel");
const Restaurant = require("../models/restaurantModel");
const MenuItem = require("../models/menuItemModel");


const submitRating = asyncHandler(async (req, res) => {
  const {
    orderId,
    restaurantRating,
    deliveryRating,
    foodRating,
    comment,
    ratedMenuItems
  } = req.body;

  // Validation
  if (!orderId || !restaurantRating || !foodRating) {
    res.status(400);
    throw new Error("Order ID, restaurant rating, and food rating are required");
  }

  // Check if order exists and belongs to this user
  const order = await Order.findOne({
    _id: orderId,
    customerId: req.user._id,
    status: "delivered" // Only delivered orders can be rated
  });

  if (!order) {
    res.status(404);
    throw new Error("Order not found or not eligible for rating");
  }

  // Check if order has already been rated
  const existingRating = await Rating.findOne({ orderId });
  if (existingRating) {
    res.status(400);
    throw new Error("You have already rated this order");
  }

  // Create rating
  const rating = await Rating.create({
    userId: req.user._id,
    orderId,
    restaurantId: order.restaurantId,
    restaurantRating,
    deliveryRating: deliveryRating || undefined,
    foodRating,
    comment,
    ratedMenuItems: ratedMenuItems || []
  });

  if (rating) {
    // Update restaurant rating
    const restaurant = await Restaurant.findById(order.restaurantId);
    if (restaurant) {
      // Calculate new average rating
      const newTotalRatings = restaurant.totalRatings + 1;
      const newRating = (
        (restaurant.rating * restaurant.totalRatings) + restaurantRating
      ) / newTotalRatings;
      
      // Update restaurant
      restaurant.rating = parseFloat(newRating.toFixed(1));
      restaurant.totalRatings = newTotalRatings;
      await restaurant.save();
    }

    // Update menu item ratings if provided
    if (ratedMenuItems && ratedMenuItems.length > 0) {
      for (const item of ratedMenuItems) {
        const menuItem = await MenuItem.findById(item.menuItemId);
        if (menuItem) {
          // Logic to update menu item rating could be added here
          // For simplicity, we're not implementing that in this example
        }
      }
    }

    // Update order with rating info
    order.rating = {
      food: foodRating,
      delivery: deliveryRating || undefined,
      review: comment
    };
    await order.save();

    res.status(201).json(rating);
  } else {
    res.status(400);
    throw new Error("Invalid rating data");
  }
});

// @desc    Get ratings for a restaurant
// @route   GET /api/ratings/restaurant/:id
// @access  Public
const getRestaurantRatings = asyncHandler(async (req, res) => {
  const restaurantId = req.params.id;
  const pageSize = 10;
  const page = Number(req.query.page) || 1;

  // Check if restaurant exists
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    res.status(404);
    throw new Error("Restaurant not found");
  }

  // Count total visible ratings
  const count = await Rating.countDocuments({ 
    restaurantId,
    isVisible: true
  });

  // Get ratings with user details
  const ratings = await Rating.find({ 
    restaurantId,
    isVisible: true
  })
    .populate("userId", "name")
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.status(200).json({
    ratings,
    page,
    pages: Math.ceil(count / pageSize),
    total: count
  });
});

// @desc    Get user's ratings
// @route   GET /api/ratings/user
// @access  Private
const getUserRatings = asyncHandler(async (req, res) => {
  const ratings = await Rating.find({ userId: req.user._id })
    .populate("restaurantId", "name")
    .sort({ createdAt: -1 });

  res.status(200).json(ratings);
});

// @desc    Update a rating
// @route   PUT /api/ratings/:id
// @access  Private
const updateRating = asyncHandler(async (req, res) => {
  const rating = await Rating.findById(req.params.id);

  if (!rating) {
    res.status(404);
    throw new Error("Rating not found");
  }

  // Check if rating belongs to this user
  if (rating.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to update this rating");
  }

  // Update allowed fields
  const updatedRating = await Rating.findByIdAndUpdate(
    req.params.id,
    {
      restaurantRating: req.body.restaurantRating || rating.restaurantRating,
      deliveryRating: req.body.deliveryRating || rating.deliveryRating,
      foodRating: req.body.foodRating || rating.foodRating,
      comment: req.body.comment || rating.comment,
      ratedMenuItems: req.body.ratedMenuItems || rating.ratedMenuItems
    },
    { new: true }
  );

  // Also update restaurant's average rating
  if (req.body.restaurantRating && req.body.restaurantRating !== rating.restaurantRating) {
    const restaurant = await Restaurant.findById(rating.restaurantId);
    
    if (restaurant && restaurant.totalRatings > 0) {
      // Remove old rating from average and add new one
      const oldRatingTotal = restaurant.rating * restaurant.totalRatings;
      const newRatingTotal = oldRatingTotal - rating.restaurantRating + req.body.restaurantRating;
      restaurant.rating = parseFloat((newRatingTotal / restaurant.totalRatings).toFixed(1));
      await restaurant.save();
    }
  }

  res.status(200).json(updatedRating);
});

// @desc    Delete a rating
// @route   DELETE /api/ratings/:id
// @access  Private
const deleteRating = asyncHandler(async (req, res) => {
  const rating = await Rating.findById(req.params.id);

  if (!rating) {
    res.status(404);
    throw new Error("Rating not found");
  }

  // Check if rating belongs to this user or user is admin
  if (rating.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to delete this rating");
  }

  await rating.deleteOne();

  // Update restaurant's average rating
  const restaurant = await Restaurant.findById(rating.restaurantId);
  
  if (restaurant && restaurant.totalRatings > 0) {
    // Remove this rating from average
    if (restaurant.totalRatings === 1) {
      // If this was the only rating, reset restaurant rating
      restaurant.rating = 0;
      restaurant.totalRatings = 0;
    } else {
      // Recalculate average without this rating
      const oldRatingTotal = restaurant.rating * restaurant.totalRatings;
      const newRatingTotal = oldRatingTotal - rating.restaurantRating;
      restaurant.totalRatings -= 1;
      restaurant.rating = parseFloat((newRatingTotal / restaurant.totalRatings).toFixed(1));
    }
    await restaurant.save();
  }

  res.status(200).json({ message: "Rating removed" });
});

module.exports = {
  submitRating,
  getRestaurantRatings,
  getUserRatings,
  updateRating,
  deleteRating
};
