// BULK IMPORT (1000 products)
app.get("/import-1000-products", async (req, res) => {
  try {

    const categories = [
      "earbuds", "mobile", "smartwatch",
      "bluetooth speaker", "power bank",
      "headphones", "earphones"
    ];

    let count = 0;

    for (let i = 0; i < 1000; i++) {

      const category = categories[i % categories.length];

      const product = {
        name: `Best ${category} ${i}`,
        price: Math.floor(Math.random() * 5000) + 500,
        link: `https://www.amazon.in/dp/B0TEST${i}?tag=mayhemstore-21`,
        image: "https://via.placeholder.com/200",
        category: category,
        source: "amazon"
      };

      const exists = await Product.findOne({ name: product.name });

      if (!exists) {
        await Product.create(product);
        count++;
      }
    }

    res.json({ message: "1000 Products Imported", added: count });

  } catch (err) {
    res.status(500).json({ error: "Import failed" });
  }
});
