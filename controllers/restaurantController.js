const asyncHandler = require("express-async-handler");
const Restaurant = require("../models/restaurantModel");
const MenuItem = require("../models/menuItemModel");

const createRestaurant = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    cuisine,
    address,
    phone,
    email,
    deliveryRadius,
    minOrderAmount,
    avgDeliveryTime,
    openingHours
  } = req.body;

  // Basic validation
  if (!name || !description || !cuisine || !address || !phone || !email || 
      !deliveryRadius || !minOrderAmount || !avgDeliveryTime || !openingHours) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  // Create restaurant
  const restaurant = await Restaurant.create({
    ownerId: req.user._id,
    name,
    description,
    cuisine,
    address,
    phone,
    email,
    deliveryRadius,
    minOrderAmount,
    avgDeliveryTime,
    openingHours
  });

  if (restaurant) {
    res.status(201).json(restaurant);
  } else {
    res.status(400);
    throw new Error("Invalid restaurant data");
  }
});


const getRestaurants = asyncHandler(async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.page) || 1;

  // Build query with various filters
  const query = {};
  
  // Filter by cuisine
  if (req.query.cuisine) {
    query.cuisine = { $in: req.query.cuisine.split(',') };
  }
  
  // Filter by min rating
  if (req.query.rating) {
    query.rating = { $gte: Number(req.query.rating) };
  }

  // Only show active restaurants
  query.isActive = true;

  // Count documents
  const count = await Restaurant.countDocuments(query);

  // Get restaurants
  const restaurants = await Restaurant.find(query)
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .sort({ featured: -1, rating: -1 });

  res.status(200).json({
    restaurants,
    page,
    pages: Math.ceil(count / pageSize),
    total: count
  });
});


const getRestaurantById = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (restaurant) {
    // Get menu items for this restaurant
    const menuItems = await MenuItem.find({ 
      restaurantId: restaurant._id,
      isAvailable: true
    }).sort({ category: 1, isFeatured: -1 });

    // Group menu items by category
    const menu = {};
    menuItems.forEach(item => {
      if (!menu[item.category]) {
        menu[item.category] = [];
      }
      menu[item.category].push(item);
    });

    res.status(200).json({
      restaurant,
      menu
    });
  } else {
    res.status(404);
    throw new Error("Restaurant not found");
  }
});


// @route   PUT /api/restaurants/:id
// @access  Private/Restaurant Owner
const updateRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    res.status(404);
    throw new Error("Restaurant not found");
  }

  // Check ownership
  if (restaurant.ownerId.toString() !== req.user._id.toString() && 
      req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to update this restaurant");
  }

  // Update restaurant
  const updatedRestaurant = await Restaurant.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json(updatedRestaurant);
});


const deleteRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    res.status(404);
    throw new Error("Restaurant not found");
  }

  await restaurant.deleteOne();
  
  // Also delete all menu items for this restaurant
  await MenuItem.deleteMany({ restaurantId: req.params.id });

  res.status(200).json({ message: "Restaurant removed" });
});

module.exports = {
  createRestaurant,
  getRestaurants,
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant
};
