const asyncHandler = require("express-async-handler");
const MenuItem = require("../models/menuItemModel");
const Restaurant = require("../models/restaurantModel");

// @desc    Create a new menu item
// @route   POST /api/menu-items
// @access  Private/Restaurant Owner
const createMenuItem = asyncHandler(async (req, res) => {
  const {
    restaurantId,
    name,
    description,
    price,
    category,
    preparationTime,
    customizationGroups,
    isVegetarian,
    isVegan,
    isGlutenFree,
    spicyLevel,
    containsAllergens
  } = req.body;

  // Check if restaurant exists
  const restaurant = await Restaurant.findById(restaurantId);
  
  if (!restaurant) {
    res.status(404);
    throw new Error("Restaurant not found");
  }

  // Check ownership
  if (restaurant.ownerId.toString() !== req.user._id.toString() && 
      req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to add items to this restaurant");
  }

  // Create menu item
  const menuItem = await MenuItem.create({
    restaurantId,
    name,
    description,
    price,
    category,
    preparationTime,
    customizationGroups: customizationGroups || [],
    isVegetarian: isVegetarian || false,
    isVegan: isVegan || false,
    isGlutenFree: isGlutenFree || false,
    spicyLevel: spicyLevel || 0,
    containsAllergens: containsAllergens || []
  });

  if (menuItem) {
    res.status(201).json(menuItem);
  } else {
    res.status(400);
    throw new Error("Invalid menu item data");
  }
});

// @desc    Get menu items by restaurant ID
// @route   GET /api/menu-items/restaurant/:id
// @access  Public
const getMenuItemsByRestaurant = asyncHandler(async (req, res) => {
  const menuItems = await MenuItem.find({ 
    restaurantId: req.params.id,
    isAvailable: true
  });

  res.status(200).json(menuItems);
});

// @desc    Get menu item by ID
// @route   GET /api/menu-items/:id
// @access  Public
const getMenuItemById = asyncHandler(async (req, res) => {
  const menuItem = await MenuItem.findById(req.params.id);

  if (menuItem) {
    res.status(200).json(menuItem);
  } else {
    res.status(404);
    throw new Error("Menu item not found");
  }
});

// @desc    Update menu item
// @route   PUT /api/menu-items/:id
// @access  Private/Restaurant Owner
const updateMenuItem = asyncHandler(async (req, res) => {
  const menuItem = await MenuItem.findById(req.params.id);

  if (!menuItem) {
    res.status(404);
    throw new Error("Menu item not found");
  }

  // Check if user owns the restaurant this menu item belongs to
  const restaurant = await Restaurant.findById(menuItem.restaurantId);
  
  if (!restaurant) {
    res.status(404);
    throw new Error("Restaurant not found");
  }

  if (restaurant.ownerId.toString() !== req.user._id.toString() && 
      req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to update this menu item");
  }

  // Update menu item
  const updatedMenuItem = await MenuItem.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json(updatedMenuItem);
});

// @desc    Delete menu item
// @route   DELETE /api/menu-items/:id
// @access  Private/Restaurant Owner
const deleteMenuItem = asyncHandler(async (req, res) => {
  const menuItem = await MenuItem.findById(req.params.id);

  if (!menuItem) {
    res.status(404);
    throw new Error("Menu item not found");
  }

  // Check if user owns the restaurant this menu item belongs to
  const restaurant = await Restaurant.findById(menuItem.restaurantId);
  
  if (!restaurant) {
    res.status(404);
    throw new Error("Restaurant not found");
  }

  if (restaurant.ownerId.toString() !== req.user._id.toString() && 
      req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to delete this menu item");
  }

  await menuItem.deleteOne();
  res.status(200).json({ message: "Menu item removed" });
});

module.exports = {
  createMenuItem,
  getMenuItemsByRestaurant,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem
};