const Razorpay = require('razorpay');
const crypto = require('crypto');

let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

/**
 * amountInRupees: number (e.g. 500 for ₹500)
 * Returns a Razorpay order object. Amount must be sent to Razorpay in paise.
 */
async function createOrder(amountInRupees, receiptId) {
 
  if (!razorpay) {
  throw new Error("Razorpay is not configured");
}

  const order = await razorpay.orders.create({
    amount: Math.round(amountInRupees * 100),
    currency: 'INR',
    receipt: receiptId,
    payment_capture: 1,
  });
  return order;
}

/**
 * Verify the signature returned by Razorpay Checkout after a successful payment.
 * See: https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/build-integration/#step-5-verify-payment-signature
 */
function verifyPaymentSignature({ order_id, payment_id, signature }) {
  const body = `${order_id}|${payment_id}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expected === signature;
}

/**
 * Verify webhook signature (for the /wallet/webhook route, used as a durable
 * fallback in case the client never confirms the payment back to your server).
 */
function verifyWebhookSignature(rawBody, signatureHeader) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return expected === signatureHeader;
}

module.exports = { razorpay, createOrder, verifyPaymentSignature, verifyWebhookSignature };