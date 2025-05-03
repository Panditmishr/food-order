const mongoose = require("mongoose");

const customizationOptionSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
});

const customizationGroupSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  required: {
    type: Boolean,
    default: false
  },
  multiSelect: {
    type: Boolean,
    default: false
  },
  options: [customizationOptionSchema]
});

const menuItemSchema = mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true
    },
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true
    },
    description: {
      type: String,
      required: [true, "Item description is required"]
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"]
    },
    category: {
      type: String,
      required: [true, "Category is required"]
    },
    customizationGroups: [customizationGroupSchema],
    preparationTime: {
      type: Number,
      required: [true, "Preparation time is required"],
      min: [1, "Preparation time must be positive"]
    },
    isVegetarian: {
      type: Boolean,
      default: false
    },
    isVegan: {
      type: Boolean,
      default: false
    },
    isGlutenFree: {
      type: Boolean,
      default: false
    },
    spicyLevel: {
      type: Number,
      min: 0,
      max: 3,
      default: 0
    },
    containsAllergens: {
      type: [String],
      default: []
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    timesOrdered: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const MenuItem = mongoose.model("MenuItem", menuItemSchema);

module.exports = MenuItem;