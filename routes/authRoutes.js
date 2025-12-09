const express = require("express");
const router = express.Router();
const auth = require('../controllers/authController');
const Product = require("../models/Product");
const multer = require("multer");

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

// =========================
// PUBLIC AUTH ROUTES 
// =========================
router.get("/", auth.showRegister);
router.post("/register", auth.registerUser);

router.get("/login", auth.showLogin);
router.post("/login", auth.loginUser);

router.get("/dashboard", auth.dashboard);
router.get("/logout", auth.logout);

// =========================
// USER PRODUCT PAGES
// =========================
router.get("/products", auth.productsPage);
router.get("/product/:id", auth.productDetail);


// =========================
// ADMIN PROTECTION MIDDLEWARE
// =========================
function isAdmin(req, res, next) {
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.redirect("/login");
    }
    next();
}

// =========================
// ADMIN ROUTES
// =========================
// =========================
// ADMIN ROUTES
// =========================

// SHOW ADMIN DASHBOARD


// SHOW ALL PRODUCTS
router.get("/admin/products", isAdmin, async (req, res) => {
    const products = await Product.find();
    res.render("admin-products", { user: req.session.user, products });
});

// SHOW ADD PRODUCT FORM
router.get("/admin/add-product", isAdmin, (req, res) => {
    res.render("admin-add-product", { user: req.session.user });
});

// SAVE PRODUCT WITH IMAGE UPLOAD (CLEAN VERSION)
router.post(
  "/admin/add-product",
  isAdmin,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "vImage" }
  ]),
  async (req, res) => {

    const { name, price, description, category, hasVariants } = req.body;

    let productData = {
      name,
      price,
      description,
      category,
      hasVariants: hasVariants ? true : false
    };

    // Main image
    if (req.files.image) {
      productData.image = "/uploads/" + req.files.image[0].filename;
    }

    // ✅ Handle Size + Color combos
    if (productData.hasVariants && req.body.vSize) {

      const sizes = Array.isArray(req.body.vSize)
        ? req.body.vSize
        : [req.body.vSize];

      const colorNames = Array.isArray(req.body.vColorName)
        ? req.body.vColorName
        : [req.body.vColorName];

      const colorCodes = Array.isArray(req.body.vColorCode)
        ? req.body.vColorCode
        : [req.body.vColorCode];

      const prices = Array.isArray(req.body.vPrice)
        ? req.body.vPrice
        : [req.body.vPrice];

      const images = req.files.vImage || [];

      productData.variants = sizes.map((s, i) => ({
        size: s,
        colorName: colorNames[i],
        colorCode: colorCodes[i],
        price: prices[i] || productData.price,
        image: images[i] ? "/uploads/" + images[i].filename : ""
      }));
    }

    await Product.create(productData);
    res.redirect("/admin/products");
  }
);




// EDIT PRODUCT PAGE
router.get("/admin/edit/:id", isAdmin, async (req, res) => {
    const product = await Product.findById(req.params.id);
    res.render("edit-product", { user: req.session.user, product });
});

// UPDATE PRODUCT WITH IMAGE UPLOAD (OPTIONAL)
router.post("/admin/edit-product/:id", isAdmin, upload.single("image"), async (req, res) => {
    const { name, price, description, category } = req.body;

    let updateData = { name, price, description, category };

    if (req.file) {
        updateData.image = "/uploads/" + req.file.filename;
    }

    await Product.findByIdAndUpdate(req.params.id, updateData);

    res.redirect("/admin/products");
});

// DELETE PRODUCT
router.get("/admin/delete/:id", isAdmin, async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect("/admin/products");
});

const Category = require("../models/Category");

// =========================
// ADMIN CATEGORY ROUTES
// =========================

// SHOW ALL CATEGORIES
router.get("/admin/categories", isAdmin, async (req, res) => {
    const categories = await Category.find();
    res.render("admin-categories", { user: req.session.user, categories });
});

// ADD NEW CATEGORY
router.post("/admin/categories/add", isAdmin, async (req, res) => {
    await Category.create({ name: req.body.name });
    res.redirect("/admin/categories");
});

// DELETE CATEGORY
router.get("/admin/categories/delete/:id", isAdmin, async (req, res) => {
    await Category.findByIdAndDelete(req.params.id);
    res.redirect("/admin/categories");
});

// EDIT CATEGORY (SHOW PAGE)
router.get("/admin/categories/edit/:id", isAdmin, async (req, res) => {
    const category = await Category.findById(req.params.id);
    res.render("admin-edit-category", { user: req.session.user, category });
});

// UPDATE CATEGORY
router.post("/admin/categories/edit/:id", isAdmin, async (req, res) => {
    await Category.findByIdAndUpdate(req.params.id, { name: req.body.name });
    res.redirect("/admin/categories");
});
router.get("/products/:category", async (req, res) => {
    const Category = require("../models/Category");
    const categories = await Category.find();

    const category = req.params.category.toLowerCase();

    const products = await Product.find({ category });

    res.render("products-category", {
        user: req.session.user,
        products,
        category,
        categories
    });
});
// =========================
// ADMIN SETTINGS PAGE
// =========================
router.get("/admin/settings", isAdmin, (req, res) => {
    res.render("admin-settings", { user: req.session.user });
});

// UPDATE ADMIN PROFILE
router.post("/admin/settings/update", isAdmin, upload.single("profileImage"), async (req, res) => {

    const User = require("../models/User");
    const { fullName, email } = req.body;

    let updateData = { fullName, email };

    if (req.file) {
        updateData.profileImage = "/uploads/" + req.file.filename;
    }

    // Update in database
    await User.findByIdAndUpdate(req.session.user._id, updateData);

    // Update session
    Object.assign(req.session.user, updateData);

    res.redirect("/admin/settings");
});

const bcrypt = require("bcryptjs");

router.post("/admin/settings/password", async (req, res) => {
  const { newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.send("Passwords do not match!");
  }

  const admin = await User.findOne({ role: "admin" });

  admin.password = await bcrypt.hash(newPassword, 10);
  await admin.save();

  res.redirect("/admin/settings");
});




// ADD TO CART API
router.post("/add-to-cart", (req, res) => {
  const { productId, name, price, image, size, color, qty } = req.body;

  if (!req.session.cart) {
    req.session.cart = [];
  }

  const existing = req.session.cart.find(
    (item) =>
      item.productId === productId &&
      item.size === size &&
      item.color === color
  );

  if (existing) {
    existing.qty += Number(qty);
  } else {
    req.session.cart.push({
      productId,
      name,
      price: Number(price),
      image,
      size,
      color,
      qty
    });
  }

  res.json({ success: true });
});
// SHOW CART
router.get("/cart", (req, res) => {
  res.render("cart", { cart: req.session.cart || [] });
});

// REMOVE ITEM
router.get("/cart/remove/:index", (req, res) => {
  req.session.cart.splice(req.params.index, 1);
  res.redirect("/cart");
});

// UPDATE QTY
router.get("/cart/update/:index", (req, res) => {
  const { action } = req.query;
  const item = req.session.cart[req.params.index];

  if (!item) return res.redirect("/cart");

  if (action === "inc") item.qty += 1;
  if (action === "dec" && item.qty > 1) item.qty -= 1;

  res.redirect("/cart");
});


// SHOW CHECKOUT PAGE ✅
router.get("/checkout", (req, res) => {
  const cart = req.session.cart || [];
  res.render("checkout", { cart });
});


const Order = require("../models/Order");

// PLACE ORDER (Save to DB)
router.post("/place-order", async (req, res) => {
  const { name, phone, address, city } = req.body;
  const cart = req.session.cart || [];

  if (!name || !phone || !address || !city) {
    return res.send("Please fill all fields.");
  }

  if (cart.length === 0) {
    return res.send("Your cart is empty.");
  }

  let total = 0;
  cart.forEach(item => {
    total += item.price * item.qty;
  });

  const newOrder = new Order({
    userId: req.session.user?._id,
    name,
    phone,
    address,
    city,
    items: cart,
    totalAmount: total + 7, // shipping+tax included
    paymentMethod: "Cash on Delivery",
    status: "Pending"
  });

  await newOrder.save();

  // clear cart
  req.session.cart = [];

  res.send(`
    <h2 style="text-align:center;margin-top:80px;font-family:Poppins;">
      ✅ Order Placed Successfully!
    </h2>
    <div style="text-align:center;margin-top:20px;">
      <a href="/products">
        <button style="padding:12px 20px;background:#d40000;color:#fff;border:none;border-radius:8px;">
          Continue Shopping
        </button>
      </a>
    </div>
  `);
});

// SHOW ALL ORDERS (ADMIN)
router.get("/admin/orders", isAdmin, async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });

  res.render("admin-orders", {
    user: req.session.user,
    orders
  });
});
router.get("/admin/orders/:id", isAdmin, async (req, res) => {
  const order = await Order.findById(req.params.id);
  res.render("admin-order-view", {
    user: req.session.user,
    order
  });
});

// UPDATE ORDER STATUS (ADMIN)
router.post("/admin/orders/update-status/:id", isAdmin, async (req, res) => {
  const { status } = req.body;

  await Order.findByIdAndUpdate(req.params.id, { status });

  res.redirect("/admin/orders/" + req.params.id);
});
// SHOW USER ORDERS
router.get("/my-orders", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const orders = await Order.find({
    userId: req.session.user._id
  }).sort({ createdAt: -1 });

  res.render("user-orders", {
    user: req.session.user,
    orders
  });
});






router.get("/admin/dashboard", isAdmin, async (req, res) => {
  try {
    const Order = require("../models/Order");
    const User = require("../models/User");
    const Product = require("../models/Product");

    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();

    const salesAgg = await Order.aggregate([
      { $group: { _id: null, sum: { $sum: "$totalAmount" } } }
    ]);
    const salesAmount = salesAgg[0]?.sum || 0;

    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          totalSold: { $sum: "$items.qty" },
          revenue: {
            $sum: { $multiply: ["$items.price", "$items.qty"] }
          }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5);

    const chartData = [];
    const chartLabels = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const start = new Date(date.setHours(0, 0, 0, 0));
      const end = new Date(date.setHours(23, 59, 59, 999));

      const daily = await Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, sum: { $sum: "$totalAmount" } } }
      ]);

      chartData.push(daily[0]?.sum || 0);
      chartLabels.push(start.toLocaleDateString("en-US", { weekday: "short" }));
    }

    const cats = await Product.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    const catLabels = cats.map(c => c._id || "Other");
    const catData = cats.map(c => c.count);

    res.render("admin-dashboard", {
      user: req.session.user,
      totalOrders,
      totalUsers,
      totalProducts,
      salesAmount,
      topProducts,
      recentOrders,
      chartLabels: JSON.stringify(chartLabels),
      chartData: JSON.stringify(chartData),
      catLabels: JSON.stringify(catLabels),
      catData: JSON.stringify(catData)
    });
  } catch (err) {
    console.log(err);
  }
});

const User = require("../models/User");

// USERS PAGE
router.get("/admin/users", isAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    res.render("admin-users", {
      user: req.session.user,
      users
    });
  } catch (err) {
    console.log(err);
  }
});

// BLOCK / UNBLOCK USER
router.get("/admin/user/block/:id", isAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);
  user.isBlocked = !user.isBlocked;
  await user.save();

  res.redirect("/admin/users");
});

// DELETE USER
router.get("/admin/user/delete/:id", isAdmin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.redirect("/admin/users");
});

module.exports = router;
