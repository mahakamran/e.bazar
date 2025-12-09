exports.addProduct = async (req, res) => {
    const { name, price, description, category } = req.body;

    const imagePath = "/uploads/" + req.file.filename;

    const product = new Product({
        name,
        price,
        description,
        category,
        image: imagePath
    });

    await product.save();
    res.redirect("/admin/products");
};
