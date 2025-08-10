import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

function buffer(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const sig = req.headers["stripe-signature"] as string | undefined;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !whSecret) return res.status(400).send("Missing webhook signature");

  let event: Stripe.Event;
  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, whSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook";
    return res.status(400).send(`Webhook Error: ${message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId as string | undefined;
        const customerId = session.customer as string | null;
        // TODO: call your backend (Convex action) to set plan=pro for userId and store stripeCustomerId
        console.log('Checkout completed for user:', userId, 'customer:', customerId);
        break;
      }
      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        // Optionally update plan status based on subscription status
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Webhook processing failed";
    res.status(500).json({ error });
  }
}
