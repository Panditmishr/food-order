const mongoose = require("mongoose");

const openingHoursSchema = mongoose.Schema({
  day: {
    type: String,
    enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    required: true
  },
  openTime: {
    type: String,
    required: true
  },
  closeTime: {
    type: String,
    required: true
  },
  isClosed: {
    type: Boolean,
    default: false
  }
});

const restaurantSchema = mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    name: {
      type: String,
      required: [true, "Restaurant name is required"],
      trim: true
    },
    description: {
      type: String,
      required: [true, "Restaurant description is required"]
    },
    cuisine: {
      type: [String],
      required: [true, "Cuisine type is required"]
    },
    address: {
      street: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      },
      zipCode: {
        type: String,
        required: true
      },
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true
    },
    deliveryRadius: {
      type: Number,
      required: [true, "Delivery radius is required"],
      min: [1, "Delivery radius must be positive"]
    },
    minOrderAmount: {
      type: Number,
      required: [true, "Minimum order amount is required"],
      min: [0, "Minimum order amount cannot be negative"]
    },
    avgDeliveryTime: {
      type: Number,
      required: [true, "Average delivery time is required"],
      min: [1, "Average delivery time must be positive"]
    },
    openingHours: [openingHoursSchema],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    featured: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Restaurant = mongoose.model("Restaurant", restaurantSchema);

module.exports = Restaurant;

