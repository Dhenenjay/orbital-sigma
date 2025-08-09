import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { getAuth } from "@clerk/nextjs/server";

// Expect env vars set in deployment/secrets (not committed):
// STRIPE_SECRET_KEY, STRIPE_PRICE_PRO

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const priceId = process.env.STRIPE_PRICE_PRO;
  if (!priceId) return res.status(500).json({ error: "Missing STRIPE_PRICE_PRO" });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.headers.origin}/dashboard?status=success`,
      cancel_url: `${req.headers.origin}/dashboard?status=cancelled`,
      metadata: { userId },
    });
    return res.status(200).json({ url: session.url });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
