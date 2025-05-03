const mongoose = require("mongoose");

const selectedCustomizationSchema = mongoose.Schema({
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

const orderItemSchema = mongoose.Schema({
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
  selectedCustomizations: [selectedCustomizationSchema],
  specialInstructions: String,
  itemTotal: {
    type: Number,
    required: true
  }
});

const orderSchema = mongoose.Schema(
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
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true
    },
    tax: {
      type: Number,
      required: true
    },
    deliveryFee: {
      type: Number,
      required: true
    },
    tip: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    deliveryAddress: {
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
      instructions: String
    },
    status: {
      type: String,
      enum: ["placed", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery", "delivered", "cancelled"],
      default: "placed"
    },
    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      enum: ["credit_card", "debit_card", "upi", "cash_on_delivery", "wallet"]
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending"
    },
    estimatedDeliveryTime: {
      type: Date
    },
    actualDeliveryTime: {
      type: Date
    },
    deliveryPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    specialInstructions: String,
    rating: {
      food: {
        type: Number,
        min: 1,
        max: 5
      },
      delivery: {
        type: Number,
        min: 1,
        max: 5
      },
      review: String
    }
  },
  {
    timestamps: true
  }
);
const Order = mongoose.model("Order", orderSchema);

module.exports = Order;