const mongoose = require("mongoose");

const ratingSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true
    },
    restaurantRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    deliveryRating: {
      type: Number,
      min: 1,
      max: 5
    },
    foodRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: 500
    },
    photos: [String],
    isVisible: {
      type: Boolean,
      default: true
    },
    ratedMenuItems: [
      {
        menuItemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MenuItem"
        },
        rating: {
          type: Number,
          min: 1,
          max: 5
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Only allow one rating per order
ratingSchema.index({ orderId: 1 }, { unique: true });

module.exports = mongoose.model("Rating", ratingSchema);
