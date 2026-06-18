// Stripe billing (Phase 2). Checkout session + webhook to set the user's plan.
// Stubbed so the server boots without Stripe configured; wire keys in .env.
import { Router } from 'express';
import Stripe from 'stripe';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const PRICE_IDS = {
  premium: process.env.STRIPE_PRICE_PREMIUM,
  platinum: process.env.STRIPE_PRICE_PLATINUM,
};

// Create a Checkout session for the chosen plan; returns a URL to redirect to.
router.post('/checkout', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Billing not configured yet' });
  const { plan } = req.body || {};
  const price = PRICE_IDS[plan];
  if (!price) return res.status(400).json({ error: 'Unknown plan' });

  const appUrl = process.env.APP_URL || '';
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    customer_email: req.user.email,
    client_reference_id: req.user.id,
    success_url: `${appUrl}?upgraded=1`,
    cancel_url: appUrl,
  });
  res.json({ url: session.url });
});

// Stripe calls this when a payment succeeds. Needs the raw body for signature
// verification — mounted with express.raw in index.js.
router.post('/webhook', async (req, res) => {
  if (!stripe) return res.status(503).end();
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature failed: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    // TODO: map the purchased price back to premium/platinum robustly.
    const plan = session.amount_total >= 1199 ? 'platinum' : 'premium';
    db.prepare('UPDATE users SET plan = ?, stripe_customer_id = ? WHERE id = ?')
      .run(plan, session.customer, userId);
  }

  res.json({ received: true });
});

export default router;
