const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("mongodb+srv://DZXMAYHEMGAMING1997:Vikram%401997@cluster0.bsbxqjp.mongodb.net/affiliateDB")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

const ProductSchema = new mongoose.Schema({
  name: String,
  price: String,
  link: String
});

const Product = mongoose.model("Product", ProductSchema);

app.get("/", (req, res) => {
  res.send("Backend Running 🚀");
});

app.get("/products", async (req, res) => {
  const data = await Product.find();
  res.json(data);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
