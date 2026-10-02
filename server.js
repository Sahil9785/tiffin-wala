const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const Razorpay = require('razorpay');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Validate Environment Variables
const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

if (!keyId || !keySecret) {
  console.error("❌ ERROR: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not defined in .env file.");
}

// Initialize Razorpay SDK instance
const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname)));

/**
 * GET /api/config
 * Returns public Razorpay Key ID (never returns secret)
 */
app.get('/api/config', (req, res) => {
  if (!keyId) {
    return res.status(500).json({ success: false, error: 'Razorpay Key ID not configured.' });
  }
  res.json({ success: true, key_id: keyId });
});

/**
 * STEP 1: POST /api/create-order or /.netlify/functions/create-razorpay-order
 * Creates a Razorpay Order
 * Expected Body: { amount (in paise or rupees), currency, receipt, notes }
 */
const createOrderHandler = async (req, res) => {
  try {
    let { amount, currency = 'INR', receipt, notes } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required.'
      });
    }

    // Convert amount to integer paise
    let amountInPaise = parseInt(amount, 10);
    
    // Minimum amount validation: 100 paise (₹1)
    if (isNaN(amountInPaise) || amountInPaise < 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Minimum amount is 100 paise (₹1).'
      });
    }

    const options = {
      amount: amountInPaise,
      currency: currency.toUpperCase(),
      receipt: receipt || `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      notes: notes || {}
    };

    console.log(`[Razorpay] Creating order for ₹${(amountInPaise / 100).toFixed(2)} (${amountInPaise} paise)...`);
    const order = await razorpay.orders.create(options);

    console.log(`[Razorpay] Order created successfully: ${order.id}`);
    res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      key_id: keyId
    });
  } catch (error) {
    console.error('[Razorpay] Create Order Error:', error);
    const desc = error.error?.description || error.message || 'Failed to create Razorpay order.';
    const formattedError = desc === 'Authentication failed'
      ? 'Razorpay Test Mode Authentication failed (401). Please check your Test Key ID and Key Secret in .env file.'
      : desc;

    res.status(500).json({
      success: false,
      error: formattedError
    });
  }
};

app.post('/api/create-order', createOrderHandler);
app.post('/.netlify/functions/create-razorpay-order', createOrderHandler);

/**
 * STEP 3: POST /api/verify-payment or /.netlify/functions/verify-razorpay-payment
 * Verifies Razorpay Payment Signature using HMAC-SHA256
 * Expected Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
const verifyPaymentHandler = (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification parameters (order_id, payment_id, signature).'
      });
    }

    // Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    let isMatch = false;
    try {
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const receivedBuf = Buffer.from(razorpay_signature, 'utf8');
      if (expectedBuf.length === receivedBuf.length) {
        isMatch = crypto.timingSafeEqual(expectedBuf, receivedBuf);
      }
    } catch (e) {
      isMatch = false;
    }

    if (isMatch) {
      console.log(`[Razorpay] Payment verified successfully for Order ${razorpay_order_id} (Payment ID: ${razorpay_payment_id})`);
      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully.',
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id
      });
    } else {
      console.warn(`[Razorpay] Signature mismatch for Order ${razorpay_order_id}`);
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed: Invalid signature.'
      });
    }
  } catch (error) {
    console.error('[Razorpay] Verify Payment Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error occurred while verifying payment signature.'
    });
  }
};

app.post('/api/verify-payment', verifyPaymentHandler);
app.post('/.netlify/functions/verify-razorpay-payment', verifyPaymentHandler);

// Fallback to index.html for SPA/root routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(`🍛 TiffinWala Server running at http://localhost:${PORT}`);
  console.log(`💳 Razorpay Checkout Integration Active (Key: ${keyId})`);
  console.log(`========================================================`);
});
