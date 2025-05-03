const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");

const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (authHeader && authHeader.startsWith("Bearer")) {
    token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      
      if (!req.user) {
        res.status(401);
        throw new Error("Not authorized, user not found");
      }
      
      next();
    } catch (error) {
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  } else {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

const isAdmin = asyncHandler(async (req, res, next) => {
  if (req.user && (req.user.role === "restaurant_owner" || req.user.role === "customer")) {
    next();
  } else {
    res.status(403);
    throw new Error("Not authorized as admin");
  }
});

const isRestaurantOwner = asyncHandler(async (req, res, next) => {
  if (req.user && (req.user.role === "restaurant_owner" || req.user.role === "customer")) {
    next();
  } else {
    res.status(403);
    throw new Error("Not authorized as restaurant owner");
  }
});

const isDeliveryPartner = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === "delivery_partner") {
    next();
  } else {
    res.status(403);
    throw new Error("Not authorized as delivery partner");
  }
});

module.exports = { 
    protect,
     isAdmin, 
     isRestaurantOwner, 
     isDeliveryPartner 
    };
