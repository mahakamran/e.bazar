const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  category: String,
  image: String,

  hasVariants: {
    type: Boolean,
    default: false
  },

  // ✅ Real combo variants
  variants: [
    {
      size: String,       // S / M / L / 42
      colorName: String,  // Red / Blue
      colorCode: String,  // #ff0000
      price: Number,
      image: String
    }
  ]
});

module.exports = mongoose.model("Product", productSchema);
