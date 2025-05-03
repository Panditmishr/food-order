const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const errorHandler = require("./middleware/errorHandler");
dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());


const userRoutes = require("./routes/userRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const menuItemRoutes = require("./routes/menuItemRoutes");
const orderRoutes = require("./routes/orderRoutes");
const cartRoutes = require("./routes/cartRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const couponRoutes = require("./routes/couponRoutes");


// Routes
app.use("/api/users", userRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/menu-items", menuItemRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/coupons", couponRoutes);

app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log("Connected to the database");
}).catch((err) => {
    console.log("Database connection error:", err);
});


app.listen(port, () => {
  console.log(`Food Delivery API running on port http://localhost:${port}`);
});
