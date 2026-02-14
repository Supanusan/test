import express from "express";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
import { configDotenv } from "dotenv";
import { userAuth } from "../middleware/auth.js";
import Order from "../config/shema/order.js";
import Product from "../config/shema/product.js";
import User from "../config/shema/user.js";

const router = express.Router();
configDotenv();

//create the order
router.post("/create", userAuth, async (req, res) => {
  try {
    const { products } = req.body;

    const merchant_id = process.env.MERCHANT_ID;
    const merchant_secret = process.env.MERCHANT_SECRET;

    if (!products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No products provided",
      });
    }

    const userData = await User.findById(req.user.id);
    if (!userData || !userData.address) {
      return res.status(400).json({
        success: false,
        message: "Address not found!",
        data: "/address",
      });
    }

    let order = [];
    let totalAmount = 0;
    const orderId = uuid();

    for (const item of products) {
      //
      const currentProduct = await Product.findById(item.product);
      if (!currentProduct || currentProduct.count < item.count) {
        return res.status(400).json({
          success: false,
          message: `Product not available or insufficient stock: ${item.product}`,
        });
      }

      order.push({
        product: currentProduct._id,
        count: item.count,
        price: currentProduct.price,
      });

      totalAmount += currentProduct.price * item.count;
    }

    const newOrder = await Order.create({
      user: req.user.id,
      products: order,
      address: {
        address: userData.address.address,
        city: userData.address.city,
      },
      totalAmount,
      orderId,
    });

    const hash = crypto
      .createHash("md5")
      .update(
        merchant_id +
          orderId +
          totalAmount +
          "LKR" +
          crypto
            .createHash("md5")
            .update(merchant_secret)
            .digest("hex")
            .toUpperCase(),
      )
      .digest("hex")
      .toUpperCase();
    return res.status(201).json({
      success: true,
      message: "please make the payment !",
      data: {
        currency: "LKR",
        hash,
        merchant_id,
        orderId: orderId,
        totalAmount,
        address: userData.address.address,
        city: userData.address.city,
        first_name: userData.name,
        last_name: "Nothing",
        email: userData.email,
        phone: "0759920388",
        country: "Sri Lanka",
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong!",
    });
  }
});

export default router;
