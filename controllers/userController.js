const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d"
  });
};


const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  // Validation
  if (!name || !email || !password || !phone) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  // Only allow customer and delivery_partner roles during registration
  // Restaurant owners and admins must be created by admin
  let userRole = role || "customer";
  if (userRole !== "customer" && userRole !== "delivery_partner") {
    userRole = "customer";
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: userRole
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token: generateToken(user._id)
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check for user email
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token: generateToken(user._id)
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});


const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  
  if (user) {
    res.status(200).json(user);
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});


const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});


const addUserAddress = asyncHandler(async (req, res) => {
  const { type, street, city, state, zipCode, isDefault } = req.body;

  if (!type || !street || !city || !state || !zipCode) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // If this is set as default, unset any other default addresses
  if (isDefault) {
    user.addresses.forEach(address => {
      address.isDefault = false;
    });
  }

  // Add new address
  user.addresses.push({
    type,
    street,
    city,
    state,
    zipCode,
    isDefault: isDefault || user.addresses.length === 0 // First address is default by default
  });

  const updatedUser = await user.save();
  
  res.status(201).json({
    addresses: updatedUser.addresses
  });
});


const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select("-password");
  res.status(200).json(users);
});

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  addUserAddress,
  getUsers
};
