const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  name: String,
  phone: String,
  address: String,
  city: String,

  items: [
    {
      productId: String,
      name: String,
      price: Number,
      qty: Number,
      size: String,
      color: String
    }
  ],

  totalAmount: Number,
  paymentMethod: {
    type: String,
    default: "Cash on Delivery"
  },

  status: {
    type: String,
    default: "Pending"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Order", OrderSchema);
