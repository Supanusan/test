import express from "express";
import crypto from "crypto";
import Order from "../config/shema/order.js";
const router = express.Router();

router.post("/notify", async (req, res) => {
  try {
    console.log("Payment notification received");

    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
    } = req.body;
    const order = await Order.findOne({
      orderId: order_id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "order not found !",
      });
    }

    const local_md5sig = crypto
      .createHash("md5")
      .update(
        merchant_id +
          order_id +
          payhere_amount +
          payhere_currency +
          status_code +
          crypto
            .createHash("md5")
            .update(merchant_secret)
            .digest("hex")
            .toUpperCase(),
      )
      .digest("hex")
      .toUpperCase();

    console.log("Payment notification for order:", order_id);

    if (local_md5sig === md5sig && status_code == "2") {
      // Payment success - update the database
      console.log("Payment successful for order:", order_id);
      order.orderStatus = "confirmed";
      order.paymentId = payment_id;
      await order.save();
      res.sendStatus(200);
    } else {
      console.log("Payment verification failed for order:", order_id);
      res.status(400).json({
        success: false,
        message: "Payment verification failed for order:",
        order_id,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong!",
    });
  }
});

export default router;
