const mongoose = require("mongoose");

const couponSchema = mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
    },
    description: {
      type: String,
      required: true
    },
    discountType: {
      type: String,
      required: true,
      enum: ["percentage", "fixed"]
    },
    discountValue: {
      type: Number,
      required: true
    },
    minOrderAmount: {
      type: Number,
      default: 0
    },
    maxDiscountAmount: {
      type: Number // Only applicable for percentage discounts
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    usageLimit: {
      type: Number // How many times coupon can be used overall
    },
    usedCount: {
      type: Number,
      default: 0
    },
    perUserLimit: {
      type: Number, // How many times a single user can use this coupon
      default: 1
    },
    applicableRestaurants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant"
      }
    ],
    applicableCategories: [String],
    excludedItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MenuItem"
      }
    ],
    firstTimeUsersOnly: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Coupon", couponSchema);