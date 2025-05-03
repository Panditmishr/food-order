const mongoose = require("mongoose");

const paymentSchema = mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: "USD"
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["credit_card", "debit_card", "upi", "cash_on_delivery", "wallet"]
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "completed", "failed", "refunded", "cancelled"],
      default: "pending"
    },
    transactionId: {
      type: String
    },
    paymentGateway: {
      type: String,
      enum: ["stripe", "paypal", "razorpay", "cash"]
    },
    paymentGatewayResponse: {
      type: Object
    },
    refundAmount: {
      type: Number,
      default: 0
    },
    refundReason: String,
    refundStatus: {
      type: String,
      enum: ["none", "pending", "completed", "failed"],
      default: "none"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Payment", paymentSchema);