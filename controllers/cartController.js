const asyncHandler = require("express-async-handler");
const Cart = require("../models/cartModel");
const MenuItem = require("../models/menuItemModel");
const Restaurant = require("../models/restaurantModel");
const Coupon = require("../models/couponModel");

const addItemToCart = asyncHandler(async (req, res) => {
  const {
    menuItemId,
    quantity,
    selectedCustomizations,
    specialInstructions
  } = req.body || {};  // Add empty object fallback
  
  console.log("Request body:", req.body);  // Log to debug
  console.log("Extracted menuItemId:", menuItemId);  // Log to debug
  if (!menuItemId || !quantity) {
    res.status(400);
    throw new Error("Menu item ID and quantity are required");
  }

  // Get menu item details
  const menuItem = await MenuItem.findById(menuItemId);
  if (!menuItem) {
    res.status(404);
    throw new Error("Menu item not found");
  }

  if (!menuItem.isAvailable) {
    res.status(400);
    throw new Error("This menu item is currently unavailable");
  }

  // Calculate item total price
  let itemPrice = menuItem.price;
  
  // Add customization costs
  let customizationCost = 0;
  if (selectedCustomizations && selectedCustomizations.length > 0) {
    // Validate customizations against menu item's options
    for (const selected of selectedCustomizations) {
      const group = menuItem.customizationGroups.find(g => g.name === selected.groupName);
      if (!group) {
        res.status(400);
        throw new Error(`Customization group ${selected.groupName} not found`);
      }
      
      const option = group.options.find(o => o.name === selected.optionName);
      if (!option) {
        res.status(400);
        throw new Error(`Option ${selected.optionName} not found in group ${selected.groupName}`);
      }
      
      customizationCost += option.price;
    }
  }
  
  const itemTotal = (itemPrice + customizationCost) * quantity;

  // Find existing cart for this user and restaurant
  let cart = await Cart.findOne({ 
    customerId: req.user._id,
    restaurantId: menuItem.restaurantId
  });

  // If no cart exists, create a new one
  if (!cart) {
    // Get restaurant details for delivery fee
    const restaurant = await Restaurant.findById(menuItem.restaurantId);
    if (!restaurant) {
      res.status(404);
      throw new Error("Restaurant not found");
    }

    cart = new Cart({
      customerId: req.user._id,
      restaurantId: menuItem.restaurantId,
      items: [],
      deliveryFee: 5.00 // Default delivery fee
    });
  } else {
    // Check if adding from a different restaurant
    if (cart.restaurantId.toString() !== menuItem.restaurantId.toString()) {
      res.status(400);
      throw new Error("You can only add items from one restaurant to your cart");
    }
  }

  // Check if item already exists in cart
  const existingItemIndex = cart.items.findIndex(item => 
    item.menuItemId.toString() === menuItemId.toString() && 
    JSON.stringify(item.selectedCustomizations) === JSON.stringify(selectedCustomizations)
  );

  if (existingItemIndex >= 0) {
    // Update existing item
    cart.items[existingItemIndex].quantity += quantity;
    cart.items[existingItemIndex].itemTotal = 
      (itemPrice + customizationCost) * cart.items[existingItemIndex].quantity;
  } else {
    // Add new item
    cart.items.push({
      menuItemId,
      name: menuItem.name,
      price: menuItem.price,
      quantity,
      selectedCustomizations: selectedCustomizations || [],
      specialInstructions,
      itemTotal
    });
  }

  // Save cart
  await cart.save();

  res.status(200).json(cart);
});

const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const cartItemId = req.params.itemId;

  if (!quantity || quantity < 1) {
    res.status(400);
    throw new Error("Quantity must be at least 1");
  }

  // Find user's cart
  const cart = await Cart.findOne({ customerId: req.user._id });

  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }

  // Find the item in the cart
  const cartItem = cart.items.id(cartItemId);

  if (!cartItem) {
    res.status(404);
    throw new Error("Cart item not found");
  }

  // Update quantity and total
  cartItem.quantity = quantity;
  cartItem.itemTotal = cartItem.price * quantity;
  
  // Add customization costs
  if (cartItem.selectedCustomizations && cartItem.selectedCustomizations.length > 0) {
    const customizationCost = cartItem.selectedCustomizations.reduce(
      (total, customization) => total + customization.price, 0
    );
    cartItem.itemTotal += customizationCost * quantity;
  }

  // Save cart
  await cart.save();

  res.status(200).json(cart);
});


const removeCartItem = asyncHandler(async (req, res) => {
  const cartItemId = req.params.itemId;

  // Find user's cart
  const cart = await Cart.findOne({ customerId: req.user._id });

  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }

  // Remove the item
  cart.items.pull(cartItemId);

  // If cart is empty, delete it
  if (cart.items.length === 0) {
    await cart.deleteOne();
    return res.status(200).json({ message: "Cart is now empty" });
  }

  // Save cart
  await cart.save();

  res.status(200).json(cart);
});

const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ customerId: req.user._id });

  if (!cart) {
    return res.status(200).json({ items: [], subtotal: 0, totalAmount: 0 });
  }

  res.status(200).json(cart);
});

const applyCoupon = asyncHandler(async (req, res) => {
  const { couponCode } = req.body;

  if (!couponCode) {
    res.status(400);
    throw new Error("Coupon code is required");
  }

  // Find user's cart
  const cart = await Cart.findOne({ customerId: req.user._id });

  if (!cart || cart.items.length === 0) {
    res.status(404);
    throw new Error("Cart is empty");
  }

  // Find and validate coupon
  const coupon = await Coupon.findOne({ 
    code: couponCode.toUpperCase(),
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() }
  });

  if (!coupon) {
    res.status(404);
    throw new Error("Invalid or expired coupon");
  }

  // Check usage limit
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    res.status(400);
    throw new Error("Coupon usage limit reached");
  }

  // Check minimum order amount
  if (coupon.minOrderAmount > cart.subtotal) {
    res.status(400);
    throw new Error(`Minimum order amount of ${coupon.minOrderAmount} not met`);
  }

  // Check if coupon is applicable to this restaurant
  if (coupon.applicableRestaurants && coupon.applicableRestaurants.length > 0) {
    if (!coupon.applicableRestaurants.includes(cart.restaurantId)) {
      res.status(400);
      throw new Error("Coupon not applicable to this restaurant");
    }
  }

  // Calculate discount
  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = cart.subtotal * (coupon.discountValue / 100);
    
    // Apply max discount cap if set
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }
  } else {
    // Fixed discount
    discount = coupon.discountValue;
    
    // Don't allow discount to exceed order subtotal
    if (discount > cart.subtotal) {
      discount = cart.subtotal;
    }
  }

  // Update cart with discount
  cart.couponCode = couponCode;
  cart.discount = parseFloat(discount.toFixed(2));
  cart.totalAmount = cart.subtotal + cart.tax + cart.deliveryFee - cart.discount;
  
  await cart.save();

  res.status(200).json(cart);
});


const removeCoupon = asyncHandler(async (req, res) => {
  // Find user's cart
  const cart = await Cart.findOne({ customerId: req.user._id });

  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }

  // Remove coupon and discount
  cart.couponCode = undefined;
  cart.discount = 0;
  cart.totalAmount = cart.subtotal + cart.tax + cart.deliveryFee;
  
  await cart.save();

  res.status(200).json(cart);
});


const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ customerId: req.user._id });

  if (!cart) {
    return res.status(200).json({ message: "Cart is already empty" });
  }

  await cart.deleteOne();

  res.status(200).json({ message: "Cart cleared successfully" });
});

module.exports = {
  addItemToCart,
  updateCartItem,
  removeCartItem,
  getCart,
  applyCoupon,
  removeCoupon,
  clearCart
};
