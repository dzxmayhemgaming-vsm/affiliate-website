const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const crypto = require("crypto");
const https = require("https");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("mongodb+srv://DZXMAYHEMGAMING1997:Vikram%401997@cluster0.bsbxqjp.mongodb.net/affiliateDB")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// Optional local product schema
const ProductSchema = new mongoose.Schema({
  name: String,
  price: String,
  discount: String,
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

/*
  AMAZON PA-API SETTINGS
  इन values को Render environment variables में डालो:
  AMAZON_ACCESS_KEY
  AMAZON_SECRET_KEY
  AMAZON_PARTNER_TAG
*/
const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY;
const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG;

// India marketplace
const AMAZON_HOST = "webservices.amazon.in";
const AMAZON_REGION = "eu-west-1";
const AMAZON_URI = "/paapi5/searchitems";
const AMAZON_TARGET = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";

function sha256(data) {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function hmac(key, data, encoding) {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest(encoding);
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = hmac("AWS4" + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  return hmac(kService, "aws4_request");
}

app.get("/amazon-search", async (req, res) => {
  try {
    const keyword = (req.query.q || "mobile").trim();

    if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY || !AMAZON_PARTNER_TAG) {
      return res.status(500).json({
        error: "Amazon API credentials missing in environment variables"
      });
    }

    const payloadObj = {
      Keywords: keyword,
      SearchIndex: "All",
      ItemCount: 10,
      PartnerTag: AMAZON_PARTNER_TAG,
      PartnerType: "Associates",
      Marketplace: "www.amazon.in",
      Resources: [
        "Images.Primary.Medium",
        "ItemInfo.Title",
        "Offers.Listings.Price"
      ]
    };

    const payload = JSON.stringify(payloadObj);

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8);

    const canonicalHeaders =
      `content-encoding:amz-1.0\n` +
      `content-type:application/json; charset=utf-8\n` +
      `host:${AMAZON_HOST}\n` +
      `x-amz-date:${amzDate}\n` +
      `x-amz-target:${AMAZON_TARGET}\n`;

    const signedHeaders =
      "content-encoding;content-type;host;x-amz-date;x-amz-target";

    const payloadHash = sha256(payload);

    const canonicalRequest =
      `POST\n${AMAZON_URI}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${AMAZON_REGION}/ProductAdvertisingAPI/aws4_request`;
    const stringToSign =
      `${algorithm}\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;

    const signingKey = getSignatureKey(
      AMAZON_SECRET_KEY,
      dateStamp,
      AMAZON_REGION,
      "ProductAdvertisingAPI"
    );

    const signature = hmac(signingKey, stringToSign, "hex");

    const authorizationHeader =
      `${algorithm} Credential=${AMAZON_ACCESS_KEY}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const options = {
      hostname: AMAZON_HOST,
      path: AMAZON_URI,
      method: "POST",
      headers: {
        "Content-Encoding": "amz-1.0",
        "Content-Type": "application/json; charset=utf-8",
        "Host": AMAZON_HOST,
        "X-Amz-Date": amzDate,
        "X-Amz-Target": AMAZON_TARGET,
        "Authorization": authorizationHeader,
        "Content-Length": Buffer.byteLength(payload)
      }
    };

    const apiResponse = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let data = "";
        response.on("data", chunk => data += chunk);
        response.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error("Invalid Amazon response"));
          }
        });
      });

      request.on("error", reject);
      request.write(payload);
      request.end();
    });

    const items = (apiResponse.SearchResult?.Items || []).map(item => ({
      asin: item.ASIN,
      name: item.ItemInfo?.Title?.DisplayValue || "No title",
      price: item.Offers?.Listings?.[0]?.Price?.DisplayAmount || "N/A",
      image: item.Images?.Primary?.Medium?.URL || "",
      detailPage: item.DetailPageURL || "#"
    }));

    res.json(items);
  } catch (error) {
    res.status(500).json({
      error: "Amazon fetch failed",
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
