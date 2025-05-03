const asyncHandler = require("express-async-handler");
const Payment = require("../models/paymentModel");
const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const Coupon = require("../models/couponModel");

// Mock payment processor integration
const processPayment = async (paymentMethod, amount, currency) => {
  // This would be replaced by actual payment gateway integration
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock successful payment 90% of the time
      const success = Math.random() < 0.9;
      
      if (success) {
        resolve({
          success: true,
          transactionId: `txn_${Date.now()}`,
          message: "Payment successful"
        });
      } else {
        resolve({
          success: false,
          error: "Payment processing failed",
          errorCode: "payment_failed"
        });
      }
    }, 1000);
  });
};

// @desc    Process payment for an order
// @route   POST /api/payments
// @access  Private
const createPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentMethod, paymentGateway } = req.body;

  if (!orderId || !paymentMethod) {
    res.status(400);
    throw new Error("Order ID and payment method are required");
  }

  // Check if order exists and belongs to this user
  const order = await Order.findOne({
    _id: orderId,
    customerId: req.user._id
  });

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Check if payment already exists for this order
  const existingPayment = await Payment.findOne({ orderId });
  if (existingPayment) {
    res.status(400);
    throw new Error("Payment already exists for this order");
  }

  // Handle cash on delivery separately
  if (paymentMethod === "cash_on_delivery") {
    const payment = await Payment.create({
      orderId,
      customerId: req.user._id,
      amount: order.totalAmount,
      paymentMethod,
      status: "pending", // Will be completed upon delivery
      paymentGateway: "cash"
    });

    // Update order payment status
    order.paymentMethod = paymentMethod;
    order.paymentStatus = "pending";
    await order.save();

    // Process coupon usage if applicable
    if (order.discount > 0 && order.couponCode) {
      await updateCouponUsage(order.couponCode);
    }

    // Clear cart after successful order
    await Cart.findOneAndDelete({ customerId: req.user._id });

    return res.status(201).json(payment);
  }

  // For other payment methods, process payment with gateway
  let paymentProcessor = paymentGateway || "stripe"; // Default to Stripe
  
  try {
    // Process payment through gateway
    const paymentResult = await processPayment(
      paymentMethod,
      order.totalAmount,
      "USD" // Hard-coded for simplicity
    );

    if (!paymentResult.success) {
      res.status(400);
      throw new Error(`Payment failed: ${paymentResult.error}`);
    }

    // Create payment record
    const payment = await Payment.create({
      orderId,
      customerId: req.user._id,
      amount: order.totalAmount,
      paymentMethod,
      status: "completed",
      transactionId: paymentResult.transactionId,
      paymentGateway: paymentProcessor,
      paymentGatewayResponse: paymentResult
    });

    // Update order payment status
    order.paymentMethod = paymentMethod;
    order.paymentStatus = "completed";
    await order.save();

    // Process coupon usage if applicable
    if (order.discount > 0 && order.couponCode) {
      await updateCouponUsage(order.couponCode);
    }

    // Clear cart after successful order
    await Cart.findOneAndDelete({ customerId: req.user._id });

    res.status(201).json(payment);
  } catch (error) {
    res.status(400);
   
throw new Error(`Payment processing error: ${error.message}`);
}
});

// Helper function to update coupon usage
const updateCouponUsage = async (couponCode) => {
const coupon = await Coupon.findOne({ code: couponCode });
if (coupon) {
  coupon.usedCount += 1;
  await coupon.save();
}
};

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
const getPaymentById = asyncHandler(async (req, res) => {
const payment = await Payment.findById(req.params.id);

if (!payment) {
  res.status(404);
  throw new Error("Payment not found");
}

// Check if payment belongs to this user or user is admin
if (payment.customerId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
  res.status(403);
  throw new Error("Not authorized to access this payment");
}

res.status(200).json(payment);
});

// @desc    Get user's payments history
// @route   GET /api/payments/history
// @access  Private
const getPaymentHistory = asyncHandler(async (req, res) => {
const pageSize = 10;
const page = Number(req.query.page) || 1;

const count = await Payment.countDocuments({ customerId: req.user._id });

const payments = await Payment.find({ customerId: req.user._id })
  .populate("orderId", "orderNumber createdAt")
  .sort({ createdAt: -1 })
  .limit(pageSize)
  .skip(pageSize * (page - 1));

res.status(200).json({
  payments,
  page,
  pages: Math.ceil(count / pageSize),
  total: count
});
});

// @desc    Process refund for an order
// @route   POST /api/payments/:id/refund
// @access  Private (Admin only)
const processRefund = asyncHandler(async (req, res) => {
const { amount, reason } = req.body;

// Only admins or restaurant owners can process refunds
if (req.user.role !== "admin" && req.user.role !== "restaurantOwner") {
  res.status(403);
  throw new Error("Not authorized to process refunds");
}

const payment = await Payment.findById(req.params.id);

if (!payment) {
  res.status(404);
  throw new Error("Payment not found");
}

// Validate refund amount
if (!amount || amount <= 0 || amount > payment.amount) {
  res.status(400);
  throw new Error("Invalid refund amount");
}

// Check if payment can be refunded
if (payment.status !== "completed") {
  res.status(400);
  throw new Error("Only completed payments can be refunded");
}

// Check if already refunded
if (payment.refundStatus === "completed") {
  res.status(400);
  throw new Error("Payment has already been refunded");
}

try {
  // In a real application, this would integrate with the payment gateway's refund API
  // For this example, we'll just mock a successful refund
  const refundResult = {
    success: true,
    refundId: `refund_${Date.now()}`,
    message: "Refund processed successfully"
  };

  // Update payment with refund information
  payment.refundAmount = amount;
  payment.refundReason = reason;
  payment.refundStatus = "completed";
  payment.status = amount === payment.amount ? "refunded" : "completed";

  await payment.save();

  // Get associated order and update its status if needed
  const order = await Order.findById(payment.orderId);
  if (order) {
    // If full refund, mark order as refunded
    if (amount === payment.amount) {
      order.status = "refunded";
      order.paymentStatus = "refunded";
    } else {
      // Partial refund
      order.paymentStatus = "partially_refunded";
    }
    await order.save();
  }

  res.status(200).json({
    message: "Refund processed successfully",
    payment
  });
} catch (error) {
  res.status(400);
  throw new Error(`Refund processing error: ${error.message}`);
}
});

// @desc    Verify payment status (webhook handler)
// @route   POST /api/payments/webhook
// @access  Public
const handlePaymentWebhook = asyncHandler(async (req, res) => {
// This would handle webhooks from payment processors
// For simplicity, we'll just mock a successful webhook call

const { transactionId, event } = req.body;

if (!transactionId || !event) {
  res.status(400);
  throw new Error("Invalid webhook data");
}

const payment = await Payment.findOne({ transactionId });

if (!payment) {
  res.status(404);
  throw new Error("Payment not found");
}

// Handle different webhook events
switch (event) {
  case "payment_success":
    payment.status = "completed";
    break;
  case "payment_failed":
    payment.status = "failed";
    break;
  case "refund_completed":
    payment.refundStatus = "completed";
    payment.status = "refunded";
    break;
  default:
    // Unhandled event, log but don't throw an error
    console.log(`Unhandled payment webhook event: ${event}`);
}

await payment.save();

// Update associated order if necessary
if (event === "payment_success" || event === "payment_failed" || event === "refund_completed") {
  const order = await Order.findById(payment.orderId);
  if (order) {
    if (event === "payment_success") {
      order.paymentStatus = "completed";
    } else if (event === "payment_failed") {
      order.paymentStatus = "failed";
    } else if (event === "refund_completed") {
      order.paymentStatus = "refunded";
      order.status = "refunded";
    }
    await order.save();
  }
}

// Acknowledge webhook receipt
res.status(200).json({ received: true });
});

module.exports = {
createPayment,
getPaymentById,
getPaymentHistory,
processRefund,
handlePaymentWebhook
};