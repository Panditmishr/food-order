const mongoose = require("mongoose");

const cartItemCustomizationSchema = mongoose.Schema({
  groupName: {
    type: String,
    required: true
  },
  optionName: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  }
});

const cartItemSchema = mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuItem",
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"]
  },
  selectedCustomizations: [cartItemCustomizationSchema],
  specialInstructions: String,
  itemTotal: {
    type: Number,
    required: true
  }
});

const cartSchema = mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true
    },
    items: [cartItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    deliveryFee: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    couponCode: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400 // Cart expires after 24 hours (in seconds)
    }
  }
);

// Update totals whenever cart items change
cartSchema.pre("save", async function(next) {
  if (this.isModified("items") || this.isNew) {
    // Calculate subtotal
    this.subtotal = this.items.reduce((total, item) => total + item.itemTotal, 0);
    
    // Calculate tax (assuming 5% tax rate)
    this.tax = parseFloat((this.subtotal * 0.05).toFixed(2));
    
    // Calculate total amount
    this.totalAmount = this.subtotal + this.tax + this.deliveryFee - this.discount;
  }
  next();
});

module.exports = mongoose.model("Cart", cartSchema);
