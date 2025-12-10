const User = require('../models/User.js');
const bcrypt = require('bcryptjs');
const Product = require("../models/Product.js");
const Category = require("../models/Category.js");


// ---------------- REGISTER ----------------
exports.showRegister = (req, res) => {
    res.render("register");
};

exports.registerUser = async (req, res) => {
    const { fullName, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.send("Passwords do not match!");
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        return res.send("Email already exists!");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
        fullName,
        email,
        password: hashedPassword
    });

    await user.save();

    res.redirect("/login");
};

// ---------------- LOGIN ----------------
exports.showLogin = (req, res) => {
    res.render("login");
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    // ---- ADMIN LOGIN ----
    if (email === "admin@gmail.com" && password === "admin123") {
        req.session.user = {
            fullName: "Admin",
            email: "admin@gmail.com",
            role: "admin"
        };
        return res.redirect("/admin/dashboard");
    }

    // ---- USER LOGIN ----
    const user = await User.findOne({ email });

    if (!user) return res.send("User not found!");

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) return res.send("Invalid password!");

    req.session.user = user;

    res.redirect("/dashboard");
};

// ---------------- DASHBOARD ----------------
exports.dashboard = (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    res.render("dashboard", { user: req.session.user });
};

// ---------------- LOGOUT ----------------
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
};

// ---------------- SHOW ALL PRODUCTS (USER SIDE) ----------------
exports.productsPage = async (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    const products = await Product.find();
    const categories = await Category.find();

    res.render("products", {
        user: req.session.user,
        products,
        categories
    });
};


// ---------------- PRODUCT DETAIL PAGE ----------------
exports.productDetail = async (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    const { id } = req.params;

    const product = await Product.findById(id);
    const related = await Product.find({ _id: { $ne: id } }).limit(4);

    res.render("product-detail", {
        user: req.session.user,
        product,
        related
    });
};


