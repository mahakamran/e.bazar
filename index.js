const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);


const app = express();
const port = process.env.PORT || 3000;
app.use("/uploads", express.static("uploads"));


// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("DB Error ❌", err));


// Session (ONLY THIS — not 2 times!)
app.use(session({
    secret: process.env.SESSION_SECRET || "mahaSecretKey",
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
        url: process.env.MONGO_URL,
        ttl: 24 * 60 * 60
    })
}));


// Routes
const authRoutes = require('./routes/authRoutes.js');
app.use('/', authRoutes);
const Category = require("./models/Category.js");

async function insertDefaultCategories() {
    const defaults = ["clothes", "shoes", "watches"];

    for (let cat of defaults) {
        const exists = await Category.findOne({ name: cat });
        if (!exists) {
            await Category.create({ name: cat });
        }
    }
}

insertDefaultCategories();

app.use(async (req, res, next) => {
    res.locals.categories = await Category.find();
    next();
});


// Server Start
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
