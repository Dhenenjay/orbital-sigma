import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { getAuth } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  // In a full implementation, you would store and fetch stripeCustomerId from Convex.
  // For now, let Stripe create one automatically when first subscribing, and use the latest customer from the subscription.
  try {
    // Create a portal session requires a customer id; this example expects you supply it from your DB.
    const customerId = req.body.customerId as string | undefined;
    if (!customerId) return res.status(400).json({ error: "customerId is required" });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin}/dashboard`,
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Failed to create portal";
    return res.status(500).json({ error });
  }
}
