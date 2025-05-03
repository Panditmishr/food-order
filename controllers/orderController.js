const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");

const Order = require("../models/orderModel");
const Restaurant = require("../models/restaurantModel");
const MenuItem = require("../models/menuItemModel");


const createOrder = asyncHandler(async (req, res) => {
  const {
    restaurantId,
    items,
    deliveryAddress,
    paymentMethod,
    specialInstructions,
    tip
  } = req.body;

  if (!restaurantId || !items || items.length === 0 || !deliveryAddress || !paymentMethod) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  // Check if restaurant exists
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    res.status(404);
    throw new Error("Restaurant not found");
  }

  // Check if restaurant is active
  if (!restaurant.isActive) {
    res.status(400);
    throw new Error("Restaurant is currently not accepting orders");
  }

  // Calculate order totals
  let subtotal = 0;
  const orderItems = [];

  // Process each item in the order
  for (const item of items) {
    const menuItem = await MenuItem.findById(item.menuItemId);
    
    if (!menuItem) {
      res.status(404);
      throw new Error(`Menu item with ID ${item.menuItemId} not found`);
    }

    if (!menuItem.isAvailable) {
      res.status(400);
      throw new Error(`${menuItem.name} is currently not available`);
    }

    // Calculate item price including customizations
    let itemTotal = menuItem.price * item.quantity;
    const selectedCustomizations = [];

    if (item.customizations && item.customizations.length > 0) {
      for (const customization of item.customizations) {
        // Find the customization group and option in the menu item
        const group = menuItem.customizationGroups.find(
          g => g.name === customization.groupName
        );
        
        if (!group) {
          res.status(400);
          throw new Error(`Customization group ${customization.groupName} not found for ${menuItem.name}`);
        }

        const option = group.options.find(
          o => o.name === customization.optionName
        );

        if (!option) {
          res.status(400);
          throw new Error(`Customization option ${customization.optionName} not found in group ${customization.groupName}`);
        }

        // Add option price to item total
        itemTotal += option.price * item.quantity;
        
        // Add to selected customizations
        selectedCustomizations.push({
          groupName: customization.groupName,
          optionName: customization.optionName,
          price: option.price
        });
      }
    }

    orderItems.push({
      menuItemId: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: item.quantity,
      selectedCustomizations,
      specialInstructions: item.specialInstructions || "",
      itemTotal
    });

    subtotal += itemTotal;
    
    // Increment times ordered for this menu item
    menuItem.timesOrdered += item.quantity;
    await menuItem.save();
  }

  // Calculate tax and delivery fee
  const tax = parseFloat((subtotal * 0.1).toFixed(2)); // 10% tax
  const deliveryFee = parseFloat((5 + (subtotal * 0.05)).toFixed(2)); // Base fee + 5% of subtotal
  
  // Apply minimum order check
  if (subtotal < restaurant.minOrderAmount) {
    res.status(400);
    throw new Error(`Minimum order amount for this restaurant is $${restaurant.minOrderAmount}`);
  }

  // Calculate total
  const tipAmount = tip || 0;
  const discount = 0; // No discount by default, can be added in future
  const totalAmount = parseFloat((subtotal + tax + deliveryFee + tipAmount - discount).toFixed(2));

  // Calculate estimated delivery time (current time + restaurant's avg delivery time in minutes)
  const estimatedDeliveryTime = new Date();
  estimatedDeliveryTime.setMinutes(
    estimatedDeliveryTime.getMinutes() + restaurant.avgDeliveryTime
  );

  // Create order
  const order = await Order.create({
    customerId: req.user._id,
    restaurantId,
    items: orderItems,
    subtotal,
    tax,
    deliveryFee,
    tip: tipAmount,
    discount,
    totalAmount,
    deliveryAddress,
    paymentMethod,
    specialInstructions: specialInstructions || "",
    estimatedDeliveryTime
  });

  if (order) {
    // Set payment status based on payment method
    if (paymentMethod === "cash_on_delivery") {
      order.paymentStatus = "pending";
    } else {
      // For online payments, assume payment is completed
      order.paymentStatus = "completed";
    }
    
    await order.save();
    res.status(201).json(order);
  } else {
    res.status(400);
    throw new Error("Invalid order data");
  }
});


const getUserOrders = asyncHandler(async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.page) || 1;

  const count = await Order.countDocuments({ customerId: req.user._id });
  
  const orders = await Order.find({ customerId: req.user._id })
    .populate("restaurantId", "name")
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));
  
  res.status(200).json({
    orders,
    page,
    pages: Math.ceil(count / pageSize),
    total: count
  });
});


const getRestaurantOrders = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  
  if (!restaurant) {
    res.status(404);
    throw new Error("Restaurant not found");
  }

  // Check ownership
  if (restaurant.ownerId.toString() !== req.user._id.toString() && 
      req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to access orders for this restaurant");
  }

  const pageSize = 20;
  const page = Number(req.query.page) || 1;
  
  // Filter by status if provided
  const statusFilter = req.query.status ? { status: req.query.status } : {};
  
  const count = await Order.countDocuments({ 
    restaurantId: req.params.id,
    ...statusFilter
  });
  
  const orders = await Order.find({ 
    restaurantId: req.params.id,
    ...statusFilter
  })
    .populate("customerId", "name email phone")
    .populate("deliveryPartnerId", "name phone")
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));
  
  res.status(200).json({
    orders,
    page,
    pages: Math.ceil(count / pageSize),
    total: count
  });
});


const getDeliveryOrders = asyncHandler(async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.page) || 1;
  
 
  const statusFilter = req.query.status 
    ? { status: req.query.status } 
    : { status: { $in: ["out_for_delivery", "delivered"] } };
  
  const count = await Order.countDocuments({ 
    deliveryPartnerId: req.user._id,
    ...statusFilter
  });
  
  const orders = await Order.find({ 
    deliveryPartnerId: req.user._id,
    ...statusFilter
  })
    .populate("restaurantId", "name address phone")
    .populate("customerId", "name phone")
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));
  
  res.status(200).json({
    orders,
    page,
    pages: Math.ceil(count / pageSize),
    total: count
  });
});


const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("restaurantId", "name address phone email")
    .populate("customerId", "name phone")
    .populate("deliveryPartnerId", "name phone");

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  
  if (
    order.customerId._id.toString() !== req.user._id.toString() && // Customer
    (order.restaurantId && order.restaurantId.ownerId && order.restaurantId.ownerId.toString() !== req.user._id.toString()) && // Restaurant Owner
    (order.deliveryPartnerId && order.deliveryPartnerId._id.toString() !== req.user._id.toString()) && // Delivery Partner
    req.user.role !== "admin" // Admin
  ) {
    res.status(403);
    throw new Error("Not authorized to view this order");
  }

  res.status(200).json(order);
});


const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  if (!status) {
    res.status(400);
    throw new Error("Please provide status");
  }

  const order = await Order.findById(req.params.id);
  
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Verify the status change is valid
  const validStatusTransitions = {
    placed: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready_for_pickup", "cancelled"],
    ready_for_pickup: ["out_for_delivery", "cancelled"],
    out_for_delivery: ["delivered", "cancelled"],
    delivered: [],
    cancelled: []
  };

  if (!validStatusTransitions[order.status].includes(status)) {
    res.status(400);
    throw new Error(`Cannot change order status from ${order.status} to ${status}`);
  }

  // Check if user is authorized to update this order
  const restaurant = await Restaurant.findById(order.restaurantId);
  
  if (!restaurant) {
    res.status(404);
    throw new Error("Restaurant not found");
  }

  const isRestaurantOwner = restaurant.ownerId.toString() === req.user._id.toString();
  const isDeliveryPartner = order.deliveryPartnerId && order.deliveryPartnerId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  // Restaurant owner can update status to: confirmed, preparing, ready_for_pickup, cancelled
  // Delivery partner can update status to: out_for_delivery, delivered
  const restaurantOwnerStatuses = ["confirmed", "preparing", "ready_for_pickup", "cancelled"];
  const deliveryPartnerStatuses = ["out_for_delivery", "delivered"];

  if (
    (restaurantOwnerStatuses.includes(status) && !isRestaurantOwner && !isAdmin) ||
    (deliveryPartnerStatuses.includes(status) && !isDeliveryPartner && !isAdmin)
  ) {
    res.status(403);
    throw new Error("Not authorized to update this order status");
  }

  // Update order status
  order.status = status;
  
  // If delivered, set actual delivery time
  if (status === "delivered") {
    order.actualDeliveryTime = new Date();
  }

  // If cancelled, handle refund logic if necessary
  if (status === "cancelled" && order.paymentStatus === "completed") {
    order.paymentStatus = "refunded";
  }

  const updatedOrder = await order.save();
  
  res.status(200).json(updatedOrder);
});

const assignDeliveryPartner = asyncHandler(async (req, res) => {
  const { deliveryPartnerId } = req.body;
  
  if (!deliveryPartnerId) {
    res.status(400);
    throw new Error("Please provide delivery partner ID");
  }

  const order = await Order.findById(req.params.id);
  
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Check if user is restaurant owner
  const restaurant = await Restaurant.findById(order.restaurantId);
  
  if (!restaurant) {
    res.status(404);
    throw new Error("Restaurant not found");
  }

  if (
    restaurant.ownerId.toString() !== req.user._id.toString() && 
    req.user.role !== "admin"
  ) {
    res.status(403);
    throw new Error("Not authorized to assign delivery partners");
  }

  // Check if delivery partner exists and has correct role
  const deliveryPartner = await User.findById(deliveryPartnerId);
  
  if (!deliveryPartner || deliveryPartner.role !== "delivery_partner") {
    res.status(400);
    throw new Error("Invalid delivery partner");
  }

  // Assign delivery partner
  order.deliveryPartnerId = deliveryPartnerId;
  
  // If order is ready for pickup, update to out_for_delivery
  if (order.status === "ready_for_pickup") {
    order.status = "out_for_delivery";
  }

  const updatedOrder = await order.save();
  
  res.status(200).json(updatedOrder);
});


const rateOrder = asyncHandler(async (req, res) => {
  const { foodRating, deliveryRating, review } = req.body;
  
  if (!foodRating || !deliveryRating) {
    res.status(400);
    throw new Error("Please provide both food and delivery ratings");
  }

  const order = await Order.findById(req.params.id);
  
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Check if user is the customer who placed the order
  if (order.customerId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to rate this order");
  }

  // Check if order is delivered
  if (order.status !== "delivered") {
    res.status(400);
    throw new Error("Can only rate delivered orders");
  }

  // Check if order is already rated
  if (order.rating && order.rating.food) {
    res.status(400);
    throw new Error("Order already rated");
  }

  // Add rating
  order.rating = {
    food: foodRating,
    delivery: deliveryRating,
    review: review || ""
  };

  const updatedOrder = await order.save();
  
  // Update restaurant rating
  const restaurant = await Restaurant.findById(order.restaurantId);
  
  if (restaurant) {
    // Calculate new rating
    const newTotalRatings = restaurant.totalRatings + 1;
    const newRating = ((restaurant.rating * restaurant.totalRatings) + foodRating) / newTotalRatings;
    
    restaurant.rating = parseFloat(newRating.toFixed(1));
    restaurant.totalRatings = newTotalRatings;
    
    await restaurant.save();
  }
  
  res.status(200).json(updatedOrder);
});


const getAvailableOrders = asyncHandler(async (req, res) => {
  // Get orders that are ready for pickup and don't have a delivery partner assigned
  const orders = await Order.find({
    status: "ready_for_pickup",
    deliveryPartnerId: { $exists: false }
  })
    .populate("restaurantId", "name address")
    .populate("customerId", "name")
    .sort({ createdAt: 1 });
  
  res.status(200).json(orders);
});


const acceptOrderDelivery = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  
  if (order.status !== "ready_for_pickup") {
    res.status(400);
    throw new Error("Order is not ready for pickup");
  }

 
  if (order.deliveryPartnerId) {
    res.status(400);
    throw new Error("Order already has a delivery partner assigned");
  }

  
  order.deliveryPartnerId = req.user._id;
  order.status = "out_for_delivery";
  
  const updatedOrder = await order.save();
  
  res.status(200).json(updatedOrder);
});

module.exports = {
  createOrder,
  getUserOrders,
  getRestaurantOrders,
  getDeliveryOrders,
  getOrderById,
  updateOrderStatus,
  assignDeliveryPartner,
  rateOrder,
  getAvailableOrders,
  acceptOrderDelivery
};